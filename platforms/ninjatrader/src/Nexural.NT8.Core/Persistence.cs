using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Text;

namespace Nexural.NT8.Core
{
    internal static class DurableText
    {
        public static string Encode(string value)
        {
            return Convert.ToBase64String(Encoding.UTF8.GetBytes(value ?? string.Empty));
        }

        public static string Decode(string value)
        {
            return Encoding.UTF8.GetString(Convert.FromBase64String(value));
        }

        public static void AtomicWrite(string path, string content)
        {
            var fullPath = Path.GetFullPath(path);
            var directory = Path.GetDirectoryName(fullPath);
            if (string.IsNullOrEmpty(directory)) throw new InvalidOperationException("A parent directory is required.");
            Directory.CreateDirectory(directory);
            var temporary = fullPath + ".tmp-" + Guid.NewGuid().ToString("N");
            File.WriteAllText(temporary, content, new UTF8Encoding(false));
            if (File.Exists(fullPath))
                File.Replace(temporary, fullPath, null);
            else
                File.Move(temporary, fullPath);
        }
    }

    public sealed class FileSignalStateStore : ISignalStateStore
    {
        private readonly string path;

        public FileSignalStateStore(string path)
        {
            if (string.IsNullOrWhiteSpace(path)) throw new ArgumentException("Path is required.", "path");
            this.path = path;
        }

        public SignalCursor Load()
        {
            if (!File.Exists(path)) return new SignalCursor(0, new string[0]);
            var lines = File.ReadAllLines(path);
            if (lines.Length == 0) throw new InvalidDataException("Signal cursor is empty.");
            long sequence;
            if (!long.TryParse(lines[0], NumberStyles.Integer, CultureInfo.InvariantCulture, out sequence) || sequence < 0)
                throw new InvalidDataException("Signal cursor sequence is invalid.");
            var ids = new List<string>();
            for (var index = 1; index < lines.Length; index++) ids.Add(DurableText.Decode(lines[index]));
            return new SignalCursor(sequence, ids);
        }

        public void Save(SignalCursor cursor)
        {
            if (cursor == null) throw new ArgumentNullException("cursor");
            var content = new StringBuilder(cursor.LastSequence.ToString(CultureInfo.InvariantCulture));
            foreach (var id in cursor.RecentSignalIds) content.Append('\n').Append(DurableText.Encode(id));
            DurableText.AtomicWrite(path, content.ToString());
        }
    }

    public interface IAckJournal
    {
        void Append(AckRecord record);
        long GetHighestDurableSequence();
    }

    public sealed class InMemoryAckJournal : IAckJournal
    {
        private readonly List<AckRecord> entries = new List<AckRecord>();
        public IList<AckRecord> Entries { get { return entries.AsReadOnly(); } }
        public void Append(AckRecord record)
        {
            if (record == null) throw new ArgumentNullException("record");
            entries.Add(record);
        }

        public long GetHighestDurableSequence()
        {
            var highest = 0L;
            foreach (var entry in entries)
                if (entry.DurableSequence > highest) highest = entry.DurableSequence;
            return highest;
        }
    }

    public sealed class FileAckJournal : IAckJournal
    {
        private readonly string path;

        public FileAckJournal(string path)
        {
            if (string.IsNullOrWhiteSpace(path)) throw new ArgumentException("Path is required.", "path");
            this.path = Path.GetFullPath(path);
        }

        public void Append(AckRecord record)
        {
            if (record == null) throw new ArgumentNullException("record");
            var directory = Path.GetDirectoryName(path);
            if (string.IsNullOrEmpty(directory)) throw new InvalidOperationException("A parent directory is required.");
            Directory.CreateDirectory(directory);
            var fields = new[]
            {
                record.Sequence.ToString(CultureInfo.InvariantCulture),
                DurableText.Encode(record.SignalId),
                record.Code.ToString(),
                DurableText.Encode(record.Message),
                record.RecordedUtc.ToString("O", CultureInfo.InvariantCulture),
                record.DurableSequence.ToString(CultureInfo.InvariantCulture),
                record.KillSwitchRevision.ToString(CultureInfo.InvariantCulture)
            };
            using (var stream = new FileStream(path, FileMode.Append, FileAccess.Write, FileShare.Read))
            using (var writer = new StreamWriter(stream, new UTF8Encoding(false)))
            {
                writer.WriteLine(string.Join("|", fields));
                writer.Flush();
                stream.Flush(true);
            }
        }

        public long GetHighestDurableSequence()
        {
            if (!File.Exists(path)) return 0;
            var highest = 0L;
            foreach (var line in File.ReadLines(path))
            {
                var fields = line.Split('|');
                long sequence;
                if (fields.Length != 7 || !long.TryParse(fields[5], NumberStyles.Integer, CultureInfo.InvariantCulture, out sequence))
                    throw new InvalidDataException("Acknowledgement journal contains an invalid record.");
                if (sequence > highest) highest = sequence;
            }
            return highest;
        }
    }

    public sealed class KillSwitchState
    {
        public KillSwitchState(bool engaged, long revision, string reason, DateTime changedUtc, string operatorId)
        {
            Engaged = engaged;
            Revision = revision;
            Reason = reason ?? string.Empty;
            ChangedUtc = changedUtc;
            OperatorId = operatorId ?? string.Empty;
        }

        public bool Engaged { get; private set; }
        public long Revision { get; private set; }
        public string Reason { get; private set; }
        public DateTime ChangedUtc { get; private set; }
        public string OperatorId { get; private set; }
    }

    public interface IKillSwitchStore
    {
        KillSwitchState Load();
        void Save(KillSwitchState state);
    }

    public sealed class InMemoryKillSwitchStore : IKillSwitchStore
    {
        private KillSwitchState state = new KillSwitchState(false, 0, string.Empty, DateTime.MinValue, string.Empty);
        public KillSwitchState Load() { return state; }
        public void Save(KillSwitchState value)
        {
            if (value == null) throw new ArgumentNullException("value");
            state = value;
        }
    }

    public sealed class FileKillSwitchStore : IKillSwitchStore
    {
        private readonly string path;

        public FileKillSwitchStore(string path)
        {
            if (string.IsNullOrWhiteSpace(path)) throw new ArgumentException("Path is required.", "path");
            this.path = path;
        }

        public KillSwitchState Load()
        {
            if (!File.Exists(path)) return new KillSwitchState(false, 0, string.Empty, DateTime.MinValue, string.Empty);
            var fields = File.ReadAllText(path).Split('|');
            bool engaged;
            long revision;
            DateTime changedUtc;
            if (fields.Length != 5 || !bool.TryParse(fields[0], out engaged)
                || !long.TryParse(fields[1], NumberStyles.Integer, CultureInfo.InvariantCulture, out revision)
                || !DateTime.TryParseExact(fields[3], "O", CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out changedUtc))
                throw new InvalidDataException("Kill-switch state is invalid.");
            return new KillSwitchState(engaged, revision, DurableText.Decode(fields[2]), changedUtc, DurableText.Decode(fields[4]));
        }

        public void Save(KillSwitchState state)
        {
            if (state == null) throw new ArgumentNullException("state");
            var fields = new[]
            {
                state.Engaged.ToString(CultureInfo.InvariantCulture),
                state.Revision.ToString(CultureInfo.InvariantCulture),
                DurableText.Encode(state.Reason),
                state.ChangedUtc.ToString("O", CultureInfo.InvariantCulture),
                DurableText.Encode(state.OperatorId)
            };
            DurableText.AtomicWrite(path, string.Join("|", fields));
        }
    }

    public sealed class PersistentKillSwitch
    {
        private readonly IKillSwitchStore store;

        public PersistentKillSwitch(IKillSwitchStore store)
        {
            if (store == null) throw new ArgumentNullException("store");
            this.store = store;
            Current = store.Load();
        }

        public KillSwitchState Current { get; private set; }

        public KillSwitchState Engage(string reason, string operatorId, DateTime nowUtc)
        {
            if (string.IsNullOrWhiteSpace(reason)) throw new ArgumentException("A reason is required.", "reason");
            ValidateOperator(operatorId);
            Current = new KillSwitchState(true, Current.Revision + 1, reason, nowUtc, operatorId);
            store.Save(Current);
            return Current;
        }

        public KillSwitchState Reset(string operatorId, DateTime nowUtc)
        {
            ValidateOperator(operatorId);
            Current = new KillSwitchState(false, Current.Revision + 1, "operator reset", nowUtc, operatorId);
            store.Save(Current);
            return Current;
        }

        private static void ValidateOperator(string operatorId)
        {
            if (string.IsNullOrWhiteSpace(operatorId))
                throw new InvalidOperationException("A non-empty operator id is required.");
        }
    }
}
