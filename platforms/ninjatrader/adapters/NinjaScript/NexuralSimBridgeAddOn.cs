using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using Nexural.NT8.Core;
using NinjaTrader.Cbi;
using NinjaTrader.NinjaScript;

namespace NinjaTrader.NinjaScript.AddOns
{
    /// <summary>
    /// File-backed Sim101/Playback101 bridge scaffold. Accepted means eligible for
    /// paper routing; this class has no path that submits to any other account.
    /// </summary>
    public sealed class NexuralSimBridgeAddOn : AddOnBase
    {
        private readonly object sync = new object();
        private readonly Dictionary<string, OrderExecutionStateMachine> lifecycles = new Dictionary<string, OrderExecutionStateMachine>(StringComparer.Ordinal);
        private Account account;
        private BridgeCoordinator coordinator;
        private PersistentKillSwitch killSwitch;
        private Timer inboxTimer;
        private string inboxDirectory;
        private string processedDirectory;
        private bool reconciled;
        private int acceptedSignals;
        private long orderUpdateVersion;
        private int pollActive;

        protected override void OnStateChange()
        {
            if (State == State.SetDefaults)
            {
                Name = "NexuralSimBridgeAddOn";
                Description = "Durable simulation-only signal bridge.";
            }
            else if (State == State.Active)
            {
                StartBridge();
            }
            else if (State == State.Terminated)
            {
                StopBridge();
            }
        }

        private void StartBridge()
        {
            var root = Path.Combine(NinjaTrader.Core.Globals.UserDataDir, "Nexural", "SimBridge");
            inboxDirectory = Path.Combine(root, "inbox");
            processedDirectory = Path.Combine(root, "processed");
            Directory.CreateDirectory(inboxDirectory);
            Directory.CreateDirectory(processedDirectory);

            var killStore = new FileKillSwitchStore(Path.Combine(root, "kill-switch.state"));
            killSwitch = new PersistentKillSwitch(killStore);
            coordinator = new BridgeCoordinator(
                new SimulationAccountGate(),
                new SignalGate(new FileSignalStateStore(Path.Combine(root, "signal-cursor.state")), TimeSpan.FromSeconds(5)),
                new RiskEngine(new RiskLimits(2, 3, 500m, 5)),
                killSwitch,
                new FileAckJournal(Path.Combine(root, "acks.log")));
            coordinator.ReconcileJournal(DateTime.UtcNow);

            account = Account.All.FirstOrDefault(candidate => new SimulationAccountGate().IsAllowed(candidate.Name, MapProvider(candidate.Provider)));
            if (account == null || !IsPaperAccount(account))
            {
                killSwitch.Engage("no supported simulation account was found", "addon-startup", DateTime.UtcNow);
                Log("Nexural bridge disabled: Sim101 or Playback101 is required.", LogLevel.Error);
                return;
            }

            account.OrderUpdate += OnAccountOrderUpdate;
            account.ExecutionUpdate += OnAccountExecutionUpdate;
            account.PositionUpdate += OnAccountPositionUpdate;
            Connection.ConnectionStatusUpdate += OnConnectionStatusUpdate;
            ReconcileAccount();
            inboxTimer = new Timer(PollInbox, null, TimeSpan.Zero, TimeSpan.FromSeconds(1));
        }

        private void StopBridge()
        {
            if (inboxTimer != null)
            {
                inboxTimer.Dispose();
                inboxTimer = null;
            }
            if (account != null)
            {
                account.OrderUpdate -= OnAccountOrderUpdate;
                account.ExecutionUpdate -= OnAccountExecutionUpdate;
                account.PositionUpdate -= OnAccountPositionUpdate;
                Connection.ConnectionStatusUpdate -= OnConnectionStatusUpdate;
            }
            reconciled = false;
        }

        private void ReconcileAccount()
        {
            if (!IsPaperAccount(account))
            {
                reconciled = false;
                return;
            }

            lock (sync)
            {
                lifecycles.Clear();
                foreach (var order in account.Orders.Where(candidate => candidate.OrderState != OrderState.Filled && candidate.OrderState != OrderState.Cancelled && candidate.OrderState != OrderState.Rejected))
                    lifecycles[order.OrderId] = new OrderExecutionStateMachine(order.OrderId, Math.Max(1, order.Quantity));
                reconciled = account.ConnectionStatus == ConnectionStatus.Connected;
            }
        }

        private void PollInbox(object state)
        {
            if (Interlocked.Exchange(ref pollActive, 1) != 0)
                return;
            try
            {
                foreach (var path in Directory.GetFiles(inboxDirectory, "*.signal").OrderBy(value => value, StringComparer.Ordinal))
                    ProcessSignalFile(path);
            }
            catch (Exception exception)
            {
                EngageKillSwitch("inbox polling fault: " + exception.Message);
            }
            finally
            {
                Volatile.Write(ref pollActive, 0);
            }
        }

        private void ProcessSignalFile(string path)
        {
            SignalEnvelope signal;
            try
            {
                signal = ParseSignal(File.ReadAllText(path));
            }
            catch (Exception exception)
            {
                EngageKillSwitch("invalid signal file " + Path.GetFileName(path) + ": " + exception.Message);
                MoveToProcessed(path, ".invalid");
                return;
            }

            RiskSnapshot snapshot;
            lock (sync)
            {
                var position = FindPosition(signal.Symbol);
                var realized = Convert.ToDecimal(account.Get(AccountItem.RealizedProfitLoss, Currency.UsDollar));
                snapshot = new RiskSnapshot(reconciled, position, realized, acceptedSignals);
            }

            var ack = coordinator.Process(account == null ? string.Empty : account.Name,
                account == null ? AccountProviderKind.External : MapProvider(account.Provider), signal, DateTime.UtcNow, snapshot);
            if (ack.Accepted)
            {
                if (signal.Action != SignalAction.Flatten)
                {
                    lock (sync) acceptedSignals++;
                }
                NinjaTrader.Core.Globals.RandomDispatcher.BeginInvoke(new Action(delegate { RoutePaperSignal(signal); }));
            }
            MoveToProcessed(path, "." + ack.Code.ToString().ToLowerInvariant());
        }

        private void RoutePaperSignal(SignalEnvelope signal)
        {
            // Last-moment, exact-name gate prevents time-of-check/time-of-use account changes.
            if (!IsPaperAccount(account) || account.ConnectionStatus != ConnectionStatus.Connected)
            {
                EngageKillSwitch("paper route aborted during final account gate");
                return;
            }

            var instrument = Instrument.GetInstrument(signal.Symbol);
            if (instrument == null)
            {
                EngageKillSwitch("instrument not found: " + signal.Symbol);
                return;
            }
            if (signal.Action == SignalAction.Flatten)
            {
                account.Flatten(new[] { instrument });
                return;
            }

            var action = signal.Action == SignalAction.EnterLong ? OrderAction.Buy : OrderAction.SellShort;
            var order = account.CreateOrder(instrument, action, OrderType.Market, OrderEntry.Automated, TimeInForce.Day,
                signal.Quantity, 0, 0, string.Empty, "NX-" + signal.Sequence.ToString(CultureInfo.InvariantCulture), DateTime.MaxValue, null);
            account.Submit(new[] { order });
        }

        private int FindPosition(string symbol)
        {
            var position = account.Positions.FirstOrDefault(candidate => candidate.Instrument.FullName == symbol);
            if (position == null) return 0;
            return position.MarketPosition == MarketPosition.Short ? -position.Quantity : position.Quantity;
        }

        private void OnAccountOrderUpdate(object sender, OrderEventArgs eventArgs)
        {
            lock (sync)
            {
                OrderExecutionStateMachine lifecycle;
                if (!lifecycles.TryGetValue(eventArgs.OrderId, out lifecycle))
                {
                    lifecycle = new OrderExecutionStateMachine(eventArgs.OrderId, Math.Max(1, eventArgs.Quantity));
                    lifecycles.Add(eventArgs.OrderId, lifecycle);
                }
                var result = lifecycle.ApplyOrderUpdate(++orderUpdateVersion, MapOrderState(eventArgs.OrderState),
                    eventArgs.Error == ErrorCode.NoError ? string.Empty : eventArgs.Error + ": " + eventArgs.Comment);
                if (result.Faulted) EngageKillSwitch("order lifecycle fault: " + result.Reason);
            }
        }

        private void OnAccountExecutionUpdate(object sender, ExecutionEventArgs eventArgs)
        {
            lock (sync)
            {
                OrderExecutionStateMachine lifecycle;
                if (!lifecycles.TryGetValue(eventArgs.OrderId, out lifecycle))
                {
                    var requested = eventArgs.Execution != null && eventArgs.Execution.Order != null ? eventArgs.Execution.Order.Quantity : eventArgs.Quantity;
                    lifecycle = new OrderExecutionStateMachine(eventArgs.OrderId, Math.Max(1, requested));
                    lifecycles.Add(eventArgs.OrderId, lifecycle);
                }
                var result = lifecycle.ApplyExecution(eventArgs.ExecutionId, eventArgs.Quantity, Convert.ToDecimal(eventArgs.Price));
                if (result.Faulted) EngageKillSwitch("execution lifecycle fault: " + result.Reason);
            }
        }

        private void OnAccountPositionUpdate(object sender, PositionEventArgs eventArgs)
        {
            reconciled = account != null && account.ConnectionStatus == ConnectionStatus.Connected;
        }

        private void OnConnectionStatusUpdate(object sender, ConnectionStatusEventArgs eventArgs)
        {
            reconciled = eventArgs.Status == ConnectionStatus.Connected;
            if (eventArgs.Status == ConnectionStatus.ConnectionLost || eventArgs.Status == ConnectionStatus.Disconnected)
                EngageKillSwitch("simulation account connection lost");
            else if (eventArgs.Status == ConnectionStatus.Connected)
                ReconcileAccount();
        }

        private void EngageKillSwitch(string reason)
        {
            lock (sync)
            {
                if (killSwitch != null && !killSwitch.Current.Engaged)
                    killSwitch.Engage(reason, "addon-adapter", DateTime.UtcNow);
            }
            Log("NEXURAL SAFETY STOP: " + reason, LogLevel.Error);
        }

        private void MoveToProcessed(string path, string suffix)
        {
            var destination = Path.Combine(processedDirectory, Path.GetFileName(path) + suffix);
            if (File.Exists(destination)) destination += "." + DateTime.UtcNow.Ticks.ToString(CultureInfo.InvariantCulture);
            File.Move(path, destination);
        }

        private static SignalEnvelope ParseSignal(string value)
        {
            var fields = value.Trim().Split('|');
            if (fields.Length != 7) throw new InvalidDataException("expected seven pipe-delimited fields");
            long sequence;
            int quantity;
            SignalAction action;
            DateTime createdUtc;
            DateTime expiresUtc;
            if (!long.TryParse(fields[0], NumberStyles.Integer, CultureInfo.InvariantCulture, out sequence)
                || !Enum.TryParse(fields[3], false, out action)
                || !int.TryParse(fields[4], NumberStyles.Integer, CultureInfo.InvariantCulture, out quantity)
                || !DateTime.TryParseExact(fields[5], "O", CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out createdUtc)
                || !DateTime.TryParseExact(fields[6], "O", CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out expiresUtc))
                throw new InvalidDataException("signal fields are invalid");
            return new SignalEnvelope(sequence, Decode(fields[1]), Decode(fields[2]), action, quantity, createdUtc, expiresUtc);
        }

        private static string Decode(string value)
        {
            return Encoding.UTF8.GetString(Convert.FromBase64String(value));
        }

        private static bool IsPaperAccount(Account candidate)
        {
            return candidate != null && new SimulationAccountGate().IsAllowed(candidate.Name, MapProvider(candidate.Provider));
        }

        private static AccountProviderKind MapProvider(Provider provider)
        {
            if (provider == Provider.Simulator) return AccountProviderKind.Simulator;
            if (provider == Provider.Playback) return AccountProviderKind.Playback;
            return AccountProviderKind.External;
        }

        private static BrokerOrderState MapOrderState(OrderState state)
        {
            switch (state)
            {
                case OrderState.Accepted:
                case OrderState.AcceptedByRisk: return BrokerOrderState.Accepted;
                case OrderState.Working: return BrokerOrderState.Working;
                case OrderState.PartFilled: return BrokerOrderState.PartFilled;
                case OrderState.Filled: return BrokerOrderState.Filled;
                case OrderState.CancelPending:
                case OrderState.CancelSubmitted: return BrokerOrderState.CancelPending;
                case OrderState.Cancelled: return BrokerOrderState.Cancelled;
                case OrderState.Rejected: return BrokerOrderState.Rejected;
                default: return BrokerOrderState.Submitted;
            }
        }
    }
}
