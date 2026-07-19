using System;

namespace Nexural.NT8.Core
{
    public sealed class BridgeCoordinator
    {
        private readonly SimulationAccountGate accountGate;
        private readonly SignalGate signalGate;
        private readonly RiskEngine riskEngine;
        private readonly PersistentKillSwitch killSwitch;
        private readonly IAckJournal journal;

        public BridgeCoordinator(SimulationAccountGate accountGate, SignalGate signalGate, RiskEngine riskEngine, PersistentKillSwitch killSwitch, IAckJournal journal)
        {
            if (accountGate == null) throw new ArgumentNullException("accountGate");
            if (signalGate == null) throw new ArgumentNullException("signalGate");
            if (riskEngine == null) throw new ArgumentNullException("riskEngine");
            if (killSwitch == null) throw new ArgumentNullException("killSwitch");
            if (journal == null) throw new ArgumentNullException("journal");
            this.accountGate = accountGate;
            this.signalGate = signalGate;
            this.riskEngine = riskEngine;
            this.killSwitch = killSwitch;
            this.journal = journal;
        }

        public AckRecord Process(string accountName, AccountProviderKind providerKind, SignalEnvelope signal, DateTime nowUtc, RiskSnapshot riskSnapshot)
        {
            if (nowUtc.Kind != DateTimeKind.Utc) throw new ArgumentException("Timestamp must be UTC.", "nowUtc");
            if (!accountGate.IsAllowed(accountName, providerKind))
                return Audit(signal, new Decision(DecisionCode.AccountNotAllowed, "only Sim101 and Playback101 are allowed"), nowUtc);

            var validation = signalGate.Validate(signal, nowUtc);
            if (!validation.Accepted)
                return Audit(signal, validation, nowUtc);

            Decision outcome;
            if (killSwitch.Current.Engaged && signal.Action != SignalAction.Flatten)
                outcome = new Decision(DecisionCode.KillSwitchEngaged, "kill switch is engaged");
            else
                outcome = riskEngine.Evaluate(signal.Action, signal.Quantity, riskSnapshot);

            // Consume every structurally valid forward signal, including risk rejections.
            // This preserves at-most-once semantics when limits or kill state later change.
            signalGate.Commit(signal);
            return Audit(signal, outcome, nowUtc);
        }

        public AckRecord ReconcileJournal(DateTime nowUtc)
        {
            if (nowUtc.Kind != DateTimeKind.Utc) throw new ArgumentException("Timestamp must be UTC.", "nowUtc");
            var cursor = signalGate.Current;
            if (journal.GetHighestDurableSequence() >= cursor.LastSequence)
                return null;
            var signalId = cursor.RecentSignalIds.Count == 0 ? string.Empty : cursor.RecentSignalIds[cursor.RecentSignalIds.Count - 1];
            var recovery = new AckRecord(cursor.LastSequence, signalId, DecisionCode.RecoveryAcknowledged,
                "cursor was durable but acknowledgement was missing after restart", nowUtc, cursor.LastSequence, killSwitch.Current.Revision);
            journal.Append(recovery);
            return recovery;
        }

        private AckRecord Audit(SignalEnvelope signal, Decision decision, DateTime nowUtc)
        {
            var cursor = signalGate.Current;
            var record = new AckRecord(
                signal == null ? 0 : signal.Sequence,
                signal == null ? string.Empty : signal.SignalId,
                decision.Code,
                decision.Message,
                nowUtc,
                cursor.LastSequence,
                killSwitch.Current.Revision);
            journal.Append(record);
            return record;
        }
    }
}
