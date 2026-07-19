using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;
using Nexural.NT8.Core;

internal static class Program
{
    private static int failures;

    private static int Main()
    {
        var tests = new Action[]
        {
            AccountGateAllowsOnlySimulationAccounts,
            SignalGateRejectsDuplicateAndNonMonotonicSignals,
            SignalGateRejectsExpiredAndFutureSignals,
            RiskEngineFailsClosedUntilReconciled,
            RiskEngineEnforcesEveryLimit,
            OrderLifecycleDeduplicatesPartialFillsAndCompletes,
            OrderLifecycleFaultsOnOverfillAndIllegalTransition,
            KillSwitchPersistsAcrossRestart,
            CoordinatorPersistsForwardRiskRejectionAndAck,
            CoordinatorRejectsLiveAccountWithoutAdvancingCursor,
            FileJournalAndCursorSurviveRestart,
            CoordinatorRepairsCursorAckCrashGap,
            KillSwitchBlocksEntriesButAllowsFlatten
        };

        foreach (var test in tests)
        {
            try
            {
                test();
                Console.WriteLine("PASS " + test.Method.Name);
            }
            catch (Exception exception)
            {
                failures++;
                Console.Error.WriteLine("FAIL " + test.Method.Name + ": " + exception.Message);
            }
        }

        Console.WriteLine(string.Format(CultureInfo.InvariantCulture, "{0} passed, {1} failed", tests.Length - failures, failures));
        return failures == 0 ? 0 : 1;
    }

    private static void AccountGateAllowsOnlySimulationAccounts()
    {
        var gate = new SimulationAccountGate();

        Equal(true, gate.IsAllowed("Sim101", AccountProviderKind.Simulator), "Sim101 on the simulator must be allowed");
        Equal(true, gate.IsAllowed("Playback101", AccountProviderKind.Playback), "Playback101 on playback must be allowed");
        Equal(false, gate.IsAllowed("Sim101", AccountProviderKind.External), "a spoofed Sim101 name must fail closed");
        Equal(false, gate.IsAllowed("Playback101", AccountProviderKind.Simulator), "name and provider must agree");
        Equal(false, gate.IsAllowed("SIM101", AccountProviderKind.Simulator), "account matching must be exact");
        Equal(false, gate.IsAllowed(null, AccountProviderKind.Simulator), "missing accounts must fail closed");
    }

    private static void SignalGateRejectsDuplicateAndNonMonotonicSignals()
    {
        var now = Utc(2026, 7, 19, 12, 0, 0);
        var store = new InMemorySignalStateStore();
        var gate = new SignalGate(store, TimeSpan.FromSeconds(5));
        var first = Signal(1, "alpha", now, now.AddMinutes(1));

        Equal(DecisionCode.Accepted, gate.Validate(first, now).Code, "first signal should validate");
        gate.Commit(first);
        Equal(DecisionCode.Duplicate, gate.Validate(first, now).Code, "same id must be a duplicate");
        Equal(DecisionCode.OutOfSequence, gate.Validate(Signal(1, "beta", now, now.AddMinutes(1)), now).Code, "reused sequence must fail");
        Equal(DecisionCode.OutOfSequence, gate.Validate(Signal(3, "gamma", now, now.AddMinutes(1)), now).Code, "gaps must fail");
        Equal(DecisionCode.Accepted, gate.Validate(Signal(2, "delta", now, now.AddMinutes(1)), now).Code, "next sequence should validate");
    }

    private static void SignalGateRejectsExpiredAndFutureSignals()
    {
        var now = Utc(2026, 7, 19, 12, 0, 0);
        var gate = new SignalGate(new InMemorySignalStateStore(), TimeSpan.FromSeconds(5));

        Equal(DecisionCode.Stale, gate.Validate(Signal(1, "old", now.AddMinutes(-2), now.AddSeconds(-1)), now).Code, "expired signals must fail");
        Equal(DecisionCode.FutureTimestamp, gate.Validate(Signal(1, "future", now.AddSeconds(6), now.AddMinutes(1)), now).Code, "future timestamps must fail");
    }

    private static void RiskEngineFailsClosedUntilReconciled()
    {
        var engine = new RiskEngine(new RiskLimits(2, 3, 500m, 5));
        var snapshot = new RiskSnapshot(false, 0, 0m, 0);

        Equal(DecisionCode.NotReconciled, engine.Evaluate(SignalAction.EnterLong, 1, snapshot).Code, "startup must fail closed");
    }

    private static void RiskEngineEnforcesEveryLimit()
    {
        var engine = new RiskEngine(new RiskLimits(2, 3, 500m, 5));

        Equal(DecisionCode.QuantityLimit, engine.Evaluate(SignalAction.EnterLong, 3, new RiskSnapshot(true, 0, 0m, 0)).Code, "quantity limit");
        Equal(DecisionCode.PositionLimit, engine.Evaluate(SignalAction.EnterLong, 2, new RiskSnapshot(true, 2, 0m, 0)).Code, "position limit");
        Equal(DecisionCode.DailyLossLimit, engine.Evaluate(SignalAction.EnterLong, 1, new RiskSnapshot(true, 0, -500m, 0)).Code, "daily loss limit");
        Equal(DecisionCode.SessionSignalLimit, engine.Evaluate(SignalAction.EnterLong, 1, new RiskSnapshot(true, 0, 0m, 5)).Code, "session limit");
        Equal(DecisionCode.Accepted, engine.Evaluate(SignalAction.EnterShort, 2, new RiskSnapshot(true, 1, -499m, 4)).Code, "valid order");
    }

    private static void OrderLifecycleDeduplicatesPartialFillsAndCompletes()
    {
        var lifecycle = new OrderExecutionStateMachine("order-1", 3);

        Equal(true, lifecycle.ApplyOrderUpdate(1, BrokerOrderState.Working, string.Empty).Applied, "working update");
        Equal(true, lifecycle.ApplyExecution("fill-1", 1, 100m).Applied, "first fill");
        Equal(false, lifecycle.ApplyExecution("fill-1", 1, 100m).Applied, "duplicate fill must be ignored");
        Equal(true, lifecycle.ApplyExecution("fill-2", 2, 103m).Applied, "second fill");
        Equal(3, lifecycle.FilledQuantity, "filled quantity");
        Equal(102m, lifecycle.AverageFillPrice, "weighted fill price");
        Equal(BrokerOrderState.Filled, lifecycle.State, "filled state");
        Equal(3, lifecycle.ProtectiveQuantity, "protection follows cumulative fills");
    }

    private static void OrderLifecycleFaultsOnOverfillAndIllegalTransition()
    {
        var overfill = new OrderExecutionStateMachine("order-2", 1);
        overfill.ApplyOrderUpdate(1, BrokerOrderState.Working, string.Empty);

        Equal(true, overfill.ApplyExecution("fill-1", 2, 100m).Faulted, "overfills must fault");
        Equal(BrokerOrderState.Faulted, overfill.State, "overfill fault state");

        var transition = new OrderExecutionStateMachine("order-3", 1);
        transition.ApplyOrderUpdate(1, BrokerOrderState.Filled, string.Empty);
        Equal(true, transition.ApplyOrderUpdate(2, BrokerOrderState.Working, string.Empty).Faulted, "terminal states must not regress");
    }

    private static void KillSwitchPersistsAcrossRestart()
    {
        WithTempDirectory(delegate(string directory)
        {
            var path = Path.Combine(directory, "kill-switch.state");
            var first = new PersistentKillSwitch(new FileKillSwitchStore(path));
            first.Engage("connection lost", "adapter", Utc(2026, 7, 19, 12, 0, 0));

            var restarted = new PersistentKillSwitch(new FileKillSwitchStore(path));
            Equal(true, restarted.Current.Engaged, "engaged state must survive restart");
            Equal("connection lost", restarted.Current.Reason, "reason must survive restart");
            Throws<InvalidOperationException>(delegate { restarted.Reset(string.Empty, Utc(2026, 7, 19, 12, 1, 0)); }, "reset needs an operator id");
            restarted.Reset("operator-7", Utc(2026, 7, 19, 12, 2, 0));
            Equal(false, new PersistentKillSwitch(new FileKillSwitchStore(path)).Current.Engaged, "reset must persist");
        });
    }

    private static void CoordinatorPersistsForwardRiskRejectionAndAck()
    {
        var now = Utc(2026, 7, 19, 12, 0, 0);
        var cursorStore = new InMemorySignalStateStore();
        var journal = new InMemoryAckJournal();
        var coordinator = Coordinator(cursorStore, journal, new InMemoryKillSwitchStore());

        var ack = coordinator.Process("Sim101", AccountProviderKind.Simulator, Signal(1, "too-large", now, now.AddMinutes(1), 3), now, new RiskSnapshot(true, 0, 0m, 0));

        Equal(DecisionCode.QuantityLimit, ack.Code, "risk rejection");
        Equal(1L, cursorStore.Load().LastSequence, "forward risk rejection must be consumed");
        Equal(1, journal.Entries.Count, "every consumed signal needs a durable ack");
    }

    private static void CoordinatorRejectsLiveAccountWithoutAdvancingCursor()
    {
        var now = Utc(2026, 7, 19, 12, 0, 0);
        var cursorStore = new InMemorySignalStateStore();
        var journal = new InMemoryAckJournal();
        var coordinator = Coordinator(cursorStore, journal, new InMemoryKillSwitchStore());

        var ack = coordinator.Process("Brokerage", AccountProviderKind.External, Signal(1, "unsafe", now, now.AddMinutes(1)), now, new RiskSnapshot(true, 0, 0m, 0));

        Equal(DecisionCode.AccountNotAllowed, ack.Code, "live account must fail");
        Equal(0L, cursorStore.Load().LastSequence, "unsafe account must not consume a signal");
        Equal(1, journal.Entries.Count, "unsafe attempts still need an audit ack");
    }

    private static void FileJournalAndCursorSurviveRestart()
    {
        WithTempDirectory(delegate(string directory)
        {
            var now = Utc(2026, 7, 19, 12, 0, 0);
            var cursorPath = Path.Combine(directory, "cursor.state");
            var journalPath = Path.Combine(directory, "acks.log");
            var coordinator = Coordinator(new FileSignalStateStore(cursorPath), new FileAckJournal(journalPath), new InMemoryKillSwitchStore());
            coordinator.Process("Playback101", AccountProviderKind.Playback, Signal(1, "persisted", now, now.AddMinutes(1)), now, new RiskSnapshot(true, 0, 0m, 0));

            Equal(1L, new FileSignalStateStore(cursorPath).Load().LastSequence, "cursor must survive restart");
            var lines = File.ReadAllLines(journalPath);
            Equal(1, lines.Length, "ack must survive restart");
            var encodedSignalId = Convert.ToBase64String(Encoding.UTF8.GetBytes("persisted"));
            Equal(true, lines[0].Contains(encodedSignalId), "ack must identify the signal");
        });
    }

    private static void KillSwitchBlocksEntriesButAllowsFlatten()
    {
        var now = Utc(2026, 7, 19, 12, 0, 0);
        var killStore = new InMemoryKillSwitchStore();
        var killSwitch = new PersistentKillSwitch(killStore);
        killSwitch.Engage("manual stop", "operator-7", now);
        var coordinator = Coordinator(new InMemorySignalStateStore(), new InMemoryAckJournal(), killStore);

        Equal(DecisionCode.KillSwitchEngaged, coordinator.Process("Sim101", AccountProviderKind.Simulator, Signal(1, "entry", now, now.AddMinutes(1)), now, new RiskSnapshot(true, 0, 0m, 0)).Code, "entry blocked");
        Equal(DecisionCode.Accepted, coordinator.Process("Sim101", AccountProviderKind.Simulator, Signal(2, "flatten", now, now.AddMinutes(1), 0, SignalAction.Flatten), now, new RiskSnapshot(true, 1, -900m, 99)).Code, "risk-reducing flatten remains available");
    }

    private static void CoordinatorRepairsCursorAckCrashGap()
    {
        var now = Utc(2026, 7, 19, 12, 0, 0);
        var cursor = new InMemorySignalStateStore();
        cursor.Save(new SignalCursor(4, new[] { "crash-gap" }));
        var journal = new InMemoryAckJournal();
        var coordinator = Coordinator(cursor, journal, new InMemoryKillSwitchStore());

        var recovery = coordinator.ReconcileJournal(now);

        Equal(DecisionCode.RecoveryAcknowledged, recovery.Code, "crash gap needs a recovery acknowledgement");
        Equal(4L, journal.GetHighestDurableSequence(), "journal must catch up to cursor");
        Equal(null, coordinator.ReconcileJournal(now), "recovery must be idempotent");
    }

    private static BridgeCoordinator Coordinator(ISignalStateStore cursor, IAckJournal journal, IKillSwitchStore killStore)
    {
        return new BridgeCoordinator(
            new SimulationAccountGate(),
            new SignalGate(cursor, TimeSpan.FromSeconds(5)),
            new RiskEngine(new RiskLimits(2, 3, 500m, 5)),
            new PersistentKillSwitch(killStore),
            journal);
    }

    private static SignalEnvelope Signal(long sequence, string id, DateTime createdUtc, DateTime expiresUtc, int quantity = 1, SignalAction action = SignalAction.EnterLong)
    {
        return new SignalEnvelope(sequence, id, "NQ 09-26", action, quantity, createdUtc, expiresUtc);
    }

    private static DateTime Utc(int year, int month, int day, int hour, int minute, int second)
    {
        return new DateTime(year, month, day, hour, minute, second, DateTimeKind.Utc);
    }

    private static void WithTempDirectory(Action<string> assertion)
    {
        var directory = Path.Combine(Path.GetTempPath(), "nexural-nt8-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(directory);
        try { assertion(directory); }
        finally { Directory.Delete(directory, true); }
    }

    private static void Equal<T>(T expected, T actual, string message)
    {
        if (!EqualityComparer<T>.Default.Equals(expected, actual))
            throw new InvalidOperationException(message + "; expected " + expected + ", got " + actual);
    }

    private static void Throws<T>(Action action, string message) where T : Exception
    {
        try { action(); }
        catch (T) { return; }
        throw new InvalidOperationException(message);
    }
}
