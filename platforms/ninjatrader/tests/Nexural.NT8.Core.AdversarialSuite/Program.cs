using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using Nexural.NT8.Core;

internal static class Program
{
    private const int PropertyCases = 50000;
    private const int FuzzCases = 50000;
    private static readonly DateTime Baseline = new DateTime(2026, 7, 19, 12, 0, 0, DateTimeKind.Utc);

    private static int Main(string[] args)
    {
        try
        {
            RunAccountProperties();
            RunRiskProperties();
            RunSignalProperties();
            RunLifecycleProperties();
            RunFuzzCases();
            var recovery = MeasureRecovery();
            var json = "{" +
                "\"property_cases\":" + PropertyCases.ToString(CultureInfo.InvariantCulture) + "," +
                "\"fuzz_cases\":" + FuzzCases.ToString(CultureInfo.InvariantCulture) + "," +
                "\"disconnect_rto_seconds\":" + recovery.Item1.ToString("0.000000", CultureInfo.InvariantCulture) + "," +
                "\"restart_rto_seconds\":" + recovery.Item2.ToString("0.000000", CultureInfo.InvariantCulture) +
                "}";
            if (args.Length == 2 && args[0] == "--output")
                File.WriteAllText(Path.GetFullPath(args[1]), json);
            Console.WriteLine(json);
            return 0;
        }
        catch (Exception exception)
        {
            Console.Error.WriteLine(exception.ToString());
            return 1;
        }
    }

    private static void RunAccountProperties()
    {
        var random = new Random(19071986);
        var gate = new SimulationAccountGate();
        var names = new[] { "Sim101", "Playback101", "sim101", "SIM101", "Live", "", null, " Sim101 " };
        var providers = new[] { AccountProviderKind.Simulator, AccountProviderKind.Playback, AccountProviderKind.External };
        for (var index = 0; index < PropertyCases / 5; index++)
        {
            var name = names[random.Next(names.Length)];
            var provider = providers[random.Next(providers.Length)];
            var expected = (name == "Sim101" && provider == AccountProviderKind.Simulator)
                || (name == "Playback101" && provider == AccountProviderKind.Playback);
            Equal(expected, gate.IsAllowed(name, provider), "simulation account property failed");
        }
    }

    private static void RunRiskProperties()
    {
        var random = new Random(20260719);
        var engine = new RiskEngine(new RiskLimits(4, 6, 1000m, 20));
        for (var index = 0; index < PropertyCases / 5; index++)
        {
            var action = (SignalAction)random.Next(0, 3);
            var quantity = action == SignalAction.Flatten ? 0 : random.Next(1, 9);
            var reconciled = random.Next(0, 2) == 1;
            var position = random.Next(-8, 9);
            var pnl = random.Next(-1500, 501);
            var signals = random.Next(0, 25);
            var decision = engine.Evaluate(action, quantity, new RiskSnapshot(reconciled, position, pnl, signals));
            var expected = ExpectedRisk(action, quantity, reconciled, position, pnl, signals);
            Equal(expected, decision.Code, "risk decision property failed");
        }
    }

    private static DecisionCode ExpectedRisk(SignalAction action, int quantity, bool reconciled, int position, decimal pnl, int signals)
    {
        if (!reconciled) return DecisionCode.NotReconciled;
        if (action == SignalAction.Flatten) return DecisionCode.Accepted;
        if (quantity > 4) return DecisionCode.QuantityLimit;
        var signed = action == SignalAction.EnterLong ? quantity : -quantity;
        if (Math.Abs(position + signed) > 6) return DecisionCode.PositionLimit;
        if (pnl <= -1000m) return DecisionCode.DailyLossLimit;
        if (signals >= 20) return DecisionCode.SessionSignalLimit;
        return DecisionCode.Accepted;
    }

    private static void RunSignalProperties()
    {
        var random = new Random(8675309);
        for (var index = 0; index < PropertyCases / 5; index++)
        {
            var last = random.Next(0, 1000);
            var sequence = random.Next(0, 4) == 0 ? last + random.Next(2, 6) : last + 1;
            var id = random.Next(0, 5) == 0 ? "seen" : "signal-" + index;
            var quantity = random.Next(-1, 4);
            var action = (SignalAction)random.Next(0, 3);
            var created = Baseline.AddSeconds(random.Next(-20, 10));
            var expires = created.AddSeconds(random.Next(-2, 30));
            var store = new InMemorySignalStateStore();
            for (var committed = 1; committed <= last; committed++)
                store.Save(new SignalCursor(committed, committed == last ? new[] { "seen" } : new string[0]));
            var gate = new SignalGate(store, TimeSpan.FromSeconds(5));
            var signal = new SignalEnvelope(sequence, id, "NQ 09-26", action, quantity, created, expires);
            var actual = gate.Validate(signal, Baseline).Code;
            var expected = ExpectedSignal(last, sequence, id, action, quantity, created, expires);
            Equal(expected, actual, "signal property failed");
        }
    }

    private static DecisionCode ExpectedSignal(long last, long sequence, string id, SignalAction action, int quantity, DateTime created, DateTime expires)
    {
        if (sequence <= 0 || string.IsNullOrWhiteSpace(id)) return DecisionCode.InvalidSignal;
        if (action == SignalAction.Flatten ? quantity != 0 : quantity <= 0) return DecisionCode.InvalidSignal;
        if (expires <= created || Baseline >= expires) return DecisionCode.Stale;
        if (created > Baseline.AddSeconds(5)) return DecisionCode.FutureTimestamp;
        if (last > 0 && id == "seen") return DecisionCode.Duplicate;
        if (sequence != last + 1) return DecisionCode.OutOfSequence;
        return DecisionCode.Accepted;
    }

    private static void RunLifecycleProperties()
    {
        var random = new Random(31415926);
        for (var index = 0; index < PropertyCases / 5; index++)
        {
            var requested = random.Next(1, 20);
            var lifecycle = new OrderExecutionStateMachine("order-" + index, requested);
            var appliedIds = new HashSet<string>(StringComparer.Ordinal);
            var expectedFilled = 0;
            for (var update = 0; update < 6; update++)
            {
                var id = random.Next(0, 5) == 0 && appliedIds.Count > 0 ? First(appliedIds) : "execution-" + update;
                var quantity = random.Next(1, requested + 2);
                var result = lifecycle.ApplyExecution(id, quantity, 100m + update);
                if (appliedIds.Contains(id))
                    Equal(true, result.Duplicate, "execution deduplication property failed");
                else if (expectedFilled + quantity > requested)
                    Equal(true, result.Faulted, "overfill property failed");
                else
                {
                    appliedIds.Add(id);
                    expectedFilled += quantity;
                    Equal(expectedFilled, lifecycle.FilledQuantity, "fill accumulation property failed");
                    Equal(expectedFilled, lifecycle.ProtectiveQuantity, "protection quantity property failed");
                }
                if (lifecycle.State == BrokerOrderState.Faulted || lifecycle.State == BrokerOrderState.Filled) break;
            }
            if (lifecycle.FilledQuantity > requested) throw new InvalidOperationException("filled quantity exceeded requested quantity");
        }
    }

    private static void RunFuzzCases()
    {
        var random = new Random(42424242);
        var names = new[] { null, "", " ", "Live", "Sim101", "Playback101", "SIM101", new string('A', 2048) };
        for (var index = 0; index < FuzzCases; index++)
        {
            var account = names[random.Next(names.Length)];
            var provider = (AccountProviderKind)random.Next(0, 3);
            var action = (SignalAction)random.Next(0, 3);
            var quantity = random.Next(-10, 11);
            var sequence = random.Next(-5, 8);
            var created = Baseline.AddSeconds(random.Next(-120, 121));
            var expires = created.AddSeconds(random.Next(-120, 121));
            var signal = new SignalEnvelope(sequence, index % 11 == 0 ? "" : "fuzz-" + index, index % 13 == 0 ? "" : "NQ 09-26", action, quantity, created, expires);
            var coordinator = Coordinator();
            var ack = coordinator.Process(account, provider, signal, Baseline, new RiskSnapshot(index % 7 != 0, random.Next(-10, 11), random.Next(-2000, 1001), random.Next(0, 30)));
            var allowedAccount = (account == "Sim101" && provider == AccountProviderKind.Simulator)
                || (account == "Playback101" && provider == AccountProviderKind.Playback);
            if (!allowedAccount && ack.Accepted) throw new InvalidOperationException("fuzz case accepted a non-simulation account");
            if (ack.Accepted && (sequence != 1 || string.IsNullOrWhiteSpace(signal.SignalId) || string.IsNullOrWhiteSpace(signal.Symbol)))
                throw new InvalidOperationException("fuzz case accepted an invalid signal identity");
        }
    }

    private static Tuple<double, double> MeasureRecovery()
    {
        var directory = Path.Combine(Path.GetTempPath(), "nexural-rto-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(directory);
        try
        {
            var cursorPath = Path.Combine(directory, "cursor.state");
            var killPath = Path.Combine(directory, "kill.state");
            var ackPath = Path.Combine(directory, "acks.log");
            var coordinator = Coordinator(new FileSignalStateStore(cursorPath), new FileKillSwitchStore(killPath), new FileAckJournal(ackPath));
            var accepted = coordinator.Process("Sim101", AccountProviderKind.Simulator, ValidSignal(1, "rto"), Baseline, new RiskSnapshot(true, 0, 0m, 0));
            Equal(true, accepted.Accepted, "RTO setup signal was rejected");
            var kill = new PersistentKillSwitch(new FileKillSwitchStore(killPath));
            var disconnectWatch = Stopwatch.StartNew();
            kill.Engage("connection lost", "rto-test", Baseline);
            var blocked = Coordinator(new FileSignalStateStore(cursorPath), new FileKillSwitchStore(killPath), new FileAckJournal(ackPath))
                .Process("Sim101", AccountProviderKind.Simulator, ValidSignal(2, "blocked"), Baseline, new RiskSnapshot(true, 0, 0m, 1));
            disconnectWatch.Stop();
            Equal(DecisionCode.KillSwitchEngaged, blocked.Code, "disconnect did not fail closed");

            var restartWatch = Stopwatch.StartNew();
            var restarted = Coordinator(new FileSignalStateStore(cursorPath), new FileKillSwitchStore(killPath), new FileAckJournal(ackPath));
            var recovery = restarted.ReconcileJournal(Baseline);
            restartWatch.Stop();
            if (!new PersistentKillSwitch(new FileKillSwitchStore(killPath)).Current.Engaged)
                throw new InvalidOperationException("restart lost persistent kill switch");
            if (recovery != null && recovery.Code != DecisionCode.RecoveryAcknowledged)
                throw new InvalidOperationException("restart recovery acknowledgement was invalid");
            return Tuple.Create(disconnectWatch.Elapsed.TotalSeconds, restartWatch.Elapsed.TotalSeconds);
        }
        finally
        {
            Directory.Delete(directory, true);
        }
    }

    private static BridgeCoordinator Coordinator()
    {
        return Coordinator(new InMemorySignalStateStore(), new InMemoryKillSwitchStore(), new InMemoryAckJournal());
    }

    private static BridgeCoordinator Coordinator(ISignalStateStore signals, IKillSwitchStore kill, IAckJournal journal)
    {
        return new BridgeCoordinator(new SimulationAccountGate(), new SignalGate(signals, TimeSpan.FromSeconds(5)), new RiskEngine(new RiskLimits(4, 6, 1000m, 20)), new PersistentKillSwitch(kill), journal);
    }

    private static SignalEnvelope ValidSignal(long sequence, string id)
    {
        return new SignalEnvelope(sequence, id, "NQ 09-26", SignalAction.EnterLong, 1, Baseline.AddSeconds(-1), Baseline.AddMinutes(1));
    }

    private static string First(HashSet<string> values)
    {
        foreach (var value in values) return value;
        return string.Empty;
    }

    private static void Equal<T>(T expected, T actual, string message)
    {
        if (!EqualityComparer<T>.Default.Equals(expected, actual))
            throw new InvalidOperationException(message + "; expected " + expected + ", got " + actual);
    }
}
