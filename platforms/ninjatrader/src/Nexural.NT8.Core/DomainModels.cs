using System;

namespace Nexural.NT8.Core
{
    public enum SignalAction
    {
        EnterLong,
        EnterShort,
        Flatten
    }

    public enum DecisionCode
    {
        Accepted,
        Duplicate,
        Stale,
        OutOfSequence,
        FutureTimestamp,
        AccountNotAllowed,
        KillSwitchEngaged,
        NotReconciled,
        QuantityLimit,
        PositionLimit,
        DailyLossLimit,
        SessionSignalLimit,
        InvalidSignal,
        RecoveryAcknowledged
    }

    public sealed class SignalEnvelope
    {
        public SignalEnvelope(long sequence, string signalId, string symbol, SignalAction action, int quantity, DateTime createdUtc, DateTime expiresUtc)
        {
            Sequence = sequence;
            SignalId = signalId;
            Symbol = symbol;
            Action = action;
            Quantity = quantity;
            CreatedUtc = EnsureUtc(createdUtc, "createdUtc");
            ExpiresUtc = EnsureUtc(expiresUtc, "expiresUtc");
        }

        public long Sequence { get; private set; }
        public string SignalId { get; private set; }
        public string Symbol { get; private set; }
        public SignalAction Action { get; private set; }
        public int Quantity { get; private set; }
        public DateTime CreatedUtc { get; private set; }
        public DateTime ExpiresUtc { get; private set; }

        private static DateTime EnsureUtc(DateTime value, string name)
        {
            if (value.Kind != DateTimeKind.Utc)
                throw new ArgumentException("Timestamp must be UTC.", name);
            return value;
        }
    }

    public sealed class Decision
    {
        public Decision(DecisionCode code, string message)
        {
            Code = code;
            Message = message ?? string.Empty;
        }

        public DecisionCode Code { get; private set; }
        public string Message { get; private set; }
        public bool Accepted { get { return Code == DecisionCode.Accepted; } }

        public static Decision Allow()
        {
            return new Decision(DecisionCode.Accepted, "accepted");
        }
    }

    public sealed class AckRecord
    {
        public AckRecord(long sequence, string signalId, DecisionCode code, string message, DateTime recordedUtc, long durableSequence, long killSwitchRevision)
        {
            Sequence = sequence;
            SignalId = signalId ?? string.Empty;
            Code = code;
            Message = message ?? string.Empty;
            RecordedUtc = recordedUtc;
            DurableSequence = durableSequence;
            KillSwitchRevision = killSwitchRevision;
        }

        public long Sequence { get; private set; }
        public string SignalId { get; private set; }
        public DecisionCode Code { get; private set; }
        public string Message { get; private set; }
        public DateTime RecordedUtc { get; private set; }
        public long DurableSequence { get; private set; }
        public long KillSwitchRevision { get; private set; }
        public bool Accepted { get { return Code == DecisionCode.Accepted; } }
    }
}
