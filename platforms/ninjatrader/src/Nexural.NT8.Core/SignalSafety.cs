using System;
using System.Collections.Generic;

namespace Nexural.NT8.Core
{
    public enum AccountProviderKind
    {
        Simulator,
        Playback,
        External
    }

    public sealed class SimulationAccountGate
    {
        public bool IsAllowed(string accountName, AccountProviderKind providerKind)
        {
            return (string.Equals(accountName, "Sim101", StringComparison.Ordinal) && providerKind == AccountProviderKind.Simulator)
                || (string.Equals(accountName, "Playback101", StringComparison.Ordinal) && providerKind == AccountProviderKind.Playback);
        }
    }

    public sealed class SignalCursor
    {
        public SignalCursor(long lastSequence, IEnumerable<string> recentSignalIds)
        {
            LastSequence = lastSequence;
            RecentSignalIds = new List<string>(recentSignalIds ?? new string[0]).AsReadOnly();
        }

        public long LastSequence { get; private set; }
        public IList<string> RecentSignalIds { get; private set; }
    }

    public interface ISignalStateStore
    {
        SignalCursor Load();
        void Save(SignalCursor cursor);
    }

    public sealed class InMemorySignalStateStore : ISignalStateStore
    {
        private SignalCursor cursor = new SignalCursor(0, new string[0]);

        public SignalCursor Load()
        {
            return new SignalCursor(cursor.LastSequence, cursor.RecentSignalIds);
        }

        public void Save(SignalCursor value)
        {
            if (value == null) throw new ArgumentNullException("value");
            cursor = new SignalCursor(value.LastSequence, value.RecentSignalIds);
        }
    }

    public sealed class SignalGate
    {
        private const int MaximumRememberedIds = 256;
        private readonly ISignalStateStore store;
        private readonly TimeSpan maximumFutureSkew;

        public SignalGate(ISignalStateStore store, TimeSpan maximumFutureSkew)
        {
            if (store == null) throw new ArgumentNullException("store");
            if (maximumFutureSkew < TimeSpan.Zero) throw new ArgumentOutOfRangeException("maximumFutureSkew");
            this.store = store;
            this.maximumFutureSkew = maximumFutureSkew;
        }

        public SignalCursor Current { get { return store.Load(); } }

        public Decision Validate(SignalEnvelope signal, DateTime nowUtc)
        {
            if (signal == null)
                return new Decision(DecisionCode.InvalidSignal, "signal is missing");
            if (nowUtc.Kind != DateTimeKind.Utc)
                throw new ArgumentException("Timestamp must be UTC.", "nowUtc");
            if (signal.Sequence <= 0 || string.IsNullOrWhiteSpace(signal.SignalId) || string.IsNullOrWhiteSpace(signal.Symbol))
                return new Decision(DecisionCode.InvalidSignal, "sequence, signal id, and symbol are required");
            if (signal.Action == SignalAction.Flatten ? signal.Quantity != 0 : signal.Quantity <= 0)
                return new Decision(DecisionCode.InvalidSignal, "entry quantity must be positive and flatten quantity must be zero");
            if (signal.ExpiresUtc <= signal.CreatedUtc || nowUtc >= signal.ExpiresUtc)
                return new Decision(DecisionCode.Stale, "signal is expired");
            if (signal.CreatedUtc > nowUtc.Add(maximumFutureSkew))
                return new Decision(DecisionCode.FutureTimestamp, "signal timestamp exceeds allowed clock skew");

            var cursor = store.Load();
            if (cursor.RecentSignalIds.Contains(signal.SignalId))
                return new Decision(DecisionCode.Duplicate, "signal id has already been consumed");
            if (signal.Sequence != cursor.LastSequence + 1)
                return new Decision(DecisionCode.OutOfSequence, "expected sequence " + (cursor.LastSequence + 1));
            return Decision.Allow();
        }

        public void Commit(SignalEnvelope signal)
        {
            if (signal == null) throw new ArgumentNullException("signal");
            var cursor = store.Load();
            if (signal.Sequence != cursor.LastSequence + 1)
                throw new InvalidOperationException("Only the next sequence can be committed.");
            var ids = new List<string>(cursor.RecentSignalIds);
            ids.Add(signal.SignalId);
            if (ids.Count > MaximumRememberedIds)
                ids.RemoveRange(0, ids.Count - MaximumRememberedIds);
            store.Save(new SignalCursor(signal.Sequence, ids));
        }
    }
}
