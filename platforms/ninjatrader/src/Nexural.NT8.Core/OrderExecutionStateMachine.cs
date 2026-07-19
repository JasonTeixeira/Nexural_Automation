using System;
using System.Collections.Generic;

namespace Nexural.NT8.Core
{
    public enum BrokerOrderState
    {
        Submitted,
        Accepted,
        Working,
        PartFilled,
        Filled,
        CancelPending,
        Cancelled,
        Rejected,
        Faulted
    }

    public sealed class LifecycleResult
    {
        public LifecycleResult(bool applied, bool duplicate, bool faulted, string reason)
        {
            Applied = applied;
            Duplicate = duplicate;
            Faulted = faulted;
            Reason = reason ?? string.Empty;
        }

        public bool Applied { get; private set; }
        public bool Duplicate { get; private set; }
        public bool Faulted { get; private set; }
        public string Reason { get; private set; }
    }

    public sealed class OrderExecutionStateMachine
    {
        private readonly HashSet<string> executionIds = new HashSet<string>(StringComparer.Ordinal);
        private decimal fillNotional;
        private long lastOrderUpdateVersion;

        public OrderExecutionStateMachine(string orderId, int requestedQuantity)
        {
            if (string.IsNullOrWhiteSpace(orderId)) throw new ArgumentException("Order id is required.", "orderId");
            if (requestedQuantity <= 0) throw new ArgumentOutOfRangeException("requestedQuantity");
            OrderId = orderId;
            RequestedQuantity = requestedQuantity;
            State = BrokerOrderState.Submitted;
        }

        public string OrderId { get; private set; }
        public int RequestedQuantity { get; private set; }
        public int FilledQuantity { get; private set; }
        public decimal AverageFillPrice { get { return FilledQuantity == 0 ? 0m : fillNotional / FilledQuantity; } }
        public int ProtectiveQuantity { get { return FilledQuantity; } }
        public bool RequiresProtection { get { return FilledQuantity > 0 && State != BrokerOrderState.Cancelled && State != BrokerOrderState.Rejected; } }
        public BrokerOrderState State { get; private set; }

        public LifecycleResult ApplyOrderUpdate(long version, BrokerOrderState nextState, string error)
        {
            if (version <= lastOrderUpdateVersion)
                return new LifecycleResult(false, true, false, "stale order update");
            if (!IsTransitionAllowed(State, nextState))
                return Fault("illegal transition from " + State + " to " + nextState);
            lastOrderUpdateVersion = version;
            State = string.IsNullOrWhiteSpace(error) ? nextState : BrokerOrderState.Faulted;
            return new LifecycleResult(true, false, State == BrokerOrderState.Faulted, error);
        }

        public LifecycleResult ApplyExecution(string executionId, int quantity, decimal price)
        {
            if (string.IsNullOrWhiteSpace(executionId) || quantity <= 0 || price <= 0m)
                return Fault("execution id, quantity, and price must be valid");
            if (executionIds.Contains(executionId))
                return new LifecycleResult(false, true, false, "duplicate execution");
            if (FilledQuantity + quantity > RequestedQuantity)
                return Fault("execution would overfill order");
            executionIds.Add(executionId);
            FilledQuantity += quantity;
            fillNotional += quantity * price;
            State = FilledQuantity == RequestedQuantity ? BrokerOrderState.Filled : BrokerOrderState.PartFilled;
            return new LifecycleResult(true, false, false, "execution applied");
        }

        private LifecycleResult Fault(string reason)
        {
            State = BrokerOrderState.Faulted;
            return new LifecycleResult(false, false, true, reason);
        }

        private static bool IsTransitionAllowed(BrokerOrderState current, BrokerOrderState next)
        {
            if (current == next) return true;
            if (current == BrokerOrderState.Filled || current == BrokerOrderState.Cancelled || current == BrokerOrderState.Rejected || current == BrokerOrderState.Faulted)
                return false;
            if (next == BrokerOrderState.Faulted || next == BrokerOrderState.Rejected || next == BrokerOrderState.CancelPending || next == BrokerOrderState.Cancelled)
                return true;
            if (current == BrokerOrderState.Submitted)
                return next == BrokerOrderState.Accepted || next == BrokerOrderState.Working || next == BrokerOrderState.PartFilled || next == BrokerOrderState.Filled;
            if (current == BrokerOrderState.Accepted)
                return next == BrokerOrderState.Working || next == BrokerOrderState.PartFilled || next == BrokerOrderState.Filled;
            if (current == BrokerOrderState.Working)
                return next == BrokerOrderState.PartFilled || next == BrokerOrderState.Filled;
            if (current == BrokerOrderState.PartFilled)
                return next == BrokerOrderState.Filled || next == BrokerOrderState.Working;
            return current == BrokerOrderState.CancelPending && next == BrokerOrderState.Cancelled;
        }
    }
}
