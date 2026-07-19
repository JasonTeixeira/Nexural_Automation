using System;
using System.Collections.Generic;
using System.IO;
using Nexural.NT8.Core;
using NinjaTrader.Cbi;
using NinjaTrader.NinjaScript;

namespace NinjaTrader.NinjaScript.Strategies
{
    /// <summary>
    /// Simulation-only reference strategy showing lifecycle-safe order tracking.
    /// It intentionally contains no alpha logic and cannot route to a live account.
    /// </summary>
    public sealed class NexuralSafeManagedStrategy : Strategy
    {
        private readonly Dictionary<string, OrderExecutionStateMachine> lifecycles = new Dictionary<string, OrderExecutionStateMachine>(StringComparer.Ordinal);
        private PersistentKillSwitch killSwitch;
        private bool accountReconciled;
        private long orderUpdateVersion;

        protected override void OnStateChange()
        {
            if (State == State.SetDefaults)
            {
                Name = "NexuralSafeManagedStrategy";
                Description = "Simulation-only lifecycle and risk-control reference adapter.";
                Calculate = Calculate.OnEachTick;
                EntriesPerDirection = 1;
                EntryHandling = EntryHandling.AllEntries;
                IsExitOnSessionCloseStrategy = true;
                ExitOnSessionCloseSeconds = 30;
                StartBehavior = StartBehavior.WaitUntilFlat;
                OrderFillResolution = OrderFillResolution.Standard;
                RealtimeErrorHandling = RealtimeErrorHandling.StopCancelClose;
                StopTargetHandling = StopTargetHandling.PerEntryExecution;
                TraceOrders = true;
            }
            else if (State == State.DataLoaded)
            {
                var stateDirectory = Path.Combine(NinjaTrader.Core.Globals.UserDataDir, "Nexural", "SafetySpine");
                killSwitch = new PersistentKillSwitch(new FileKillSwitchStore(Path.Combine(stateDirectory, "strategy-kill-switch.state")));
                accountReconciled = false;
            }
            else if (State == State.Transition)
            {
                accountReconciled = IsSimulationAccount() && Account.ConnectionStatus == ConnectionStatus.Connected;
                if (!IsSimulationAccount())
                    EngageKillSwitch("strategy attached to a non-simulation account");
            }
            else if (State == State.Realtime && !IsSimulationAccount())
            {
                EngageKillSwitch("realtime routing denied: only Sim101 and Playback101 are supported");
                CloseStrategy("Nexural blocked a non-simulation account.");
            }
        }

        protected override void OnBarUpdate()
        {
            // Deliberately empty. Learning exercises may add signals, but any entry must
            // first pass IsPaperRoutingReady() and the portable BridgeCoordinator.
        }

        protected override void OnOrderUpdate(Order order, double limitPrice, double stopPrice, int quantity, int filled,
            double averageFillPrice, OrderState orderState, DateTime time, ErrorCode error, string nativeError)
        {
            if (order == null || string.IsNullOrEmpty(order.OrderId))
                return;

            OrderExecutionStateMachine lifecycle;
            if (!lifecycles.TryGetValue(order.OrderId, out lifecycle))
            {
                lifecycle = new OrderExecutionStateMachine(order.OrderId, Math.Max(1, quantity));
                lifecycles.Add(order.OrderId, lifecycle);
            }

            var result = lifecycle.ApplyOrderUpdate(++orderUpdateVersion, MapOrderState(orderState),
                error == ErrorCode.NoError ? string.Empty : error + ": " + nativeError);
            if (result.Faulted)
                EngageKillSwitch("order lifecycle fault: " + result.Reason);
        }

        protected override void OnExecutionUpdate(Execution execution, string executionId, double price, int quantity,
            MarketPosition marketPosition, string orderId, DateTime time)
        {
            OrderExecutionStateMachine lifecycle;
            if (!lifecycles.TryGetValue(orderId, out lifecycle))
            {
                var requested = execution != null && execution.Order != null ? execution.Order.Quantity : quantity;
                lifecycle = new OrderExecutionStateMachine(orderId, Math.Max(1, requested));
                lifecycles.Add(orderId, lifecycle);
            }

            var result = lifecycle.ApplyExecution(executionId, quantity, Convert.ToDecimal(price));
            if (result.Faulted)
                EngageKillSwitch("execution lifecycle fault: " + result.Reason);

            // Protective sizing must use lifecycle.ProtectiveQuantity (cumulative fills),
            // never the requested order size. Add stops/targets here in an exercise.
        }

        protected override void OnPositionUpdate(Position position, double averagePrice, int quantity, MarketPosition marketPosition)
        {
            accountReconciled = IsSimulationAccount() && Account.ConnectionStatus == ConnectionStatus.Connected;
        }

        protected override void OnConnectionStatusUpdate(ConnectionStatusEventArgs connectionStatusUpdate)
        {
            if (Account == null || connectionStatusUpdate.Connection != Account.Connection)
                return;
            accountReconciled = connectionStatusUpdate.Status == ConnectionStatus.Connected;
            if (connectionStatusUpdate.Status == ConnectionStatus.ConnectionLost || connectionStatusUpdate.Status == ConnectionStatus.Disconnected)
                EngageKillSwitch("account connection lost");
        }

        private bool IsPaperRoutingReady()
        {
            return IsSimulationAccount() && accountReconciled && killSwitch != null && !killSwitch.Current.Engaged;
        }

        private bool IsSimulationAccount()
        {
            return Account != null && new SimulationAccountGate().IsAllowed(Account.Name, MapProvider(Account.Provider));
        }

        private static AccountProviderKind MapProvider(Provider provider)
        {
            if (provider == Provider.Simulator) return AccountProviderKind.Simulator;
            if (provider == Provider.Playback) return AccountProviderKind.Playback;
            return AccountProviderKind.External;
        }

        private void EngageKillSwitch(string reason)
        {
            if (killSwitch != null && !killSwitch.Current.Engaged)
                killSwitch.Engage(reason, "strategy-adapter", DateTime.UtcNow);
            Print("NEXURAL SAFETY STOP: " + reason);
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
