using System;

namespace Nexural.NT8.Core
{
    public sealed class RiskLimits
    {
        public RiskLimits(int maximumOrderQuantity, int maximumAbsolutePosition, decimal maximumDailyLoss, int maximumSignalsPerSession)
        {
            if (maximumOrderQuantity <= 0) throw new ArgumentOutOfRangeException("maximumOrderQuantity");
            if (maximumAbsolutePosition <= 0) throw new ArgumentOutOfRangeException("maximumAbsolutePosition");
            if (maximumDailyLoss <= 0m) throw new ArgumentOutOfRangeException("maximumDailyLoss");
            if (maximumSignalsPerSession <= 0) throw new ArgumentOutOfRangeException("maximumSignalsPerSession");
            MaximumOrderQuantity = maximumOrderQuantity;
            MaximumAbsolutePosition = maximumAbsolutePosition;
            MaximumDailyLoss = maximumDailyLoss;
            MaximumSignalsPerSession = maximumSignalsPerSession;
        }

        public int MaximumOrderQuantity { get; private set; }
        public int MaximumAbsolutePosition { get; private set; }
        public decimal MaximumDailyLoss { get; private set; }
        public int MaximumSignalsPerSession { get; private set; }
    }

    public sealed class RiskSnapshot
    {
        public RiskSnapshot(bool isReconciled, int currentPosition, decimal realizedPnl, int acceptedSignalsThisSession)
        {
            IsReconciled = isReconciled;
            CurrentPosition = currentPosition;
            RealizedPnl = realizedPnl;
            AcceptedSignalsThisSession = acceptedSignalsThisSession;
        }

        public bool IsReconciled { get; private set; }
        public int CurrentPosition { get; private set; }
        public decimal RealizedPnl { get; private set; }
        public int AcceptedSignalsThisSession { get; private set; }
    }

    public sealed class RiskEngine
    {
        private readonly RiskLimits limits;

        public RiskEngine(RiskLimits limits)
        {
            if (limits == null) throw new ArgumentNullException("limits");
            this.limits = limits;
        }

        public Decision Evaluate(SignalAction action, int quantity, RiskSnapshot snapshot)
        {
            if (snapshot == null)
                return new Decision(DecisionCode.NotReconciled, "risk state is unavailable");
            if (!snapshot.IsReconciled)
                return new Decision(DecisionCode.NotReconciled, "account state has not been reconciled");
            if (action == SignalAction.Flatten)
                return Decision.Allow();
            if (quantity > limits.MaximumOrderQuantity)
                return new Decision(DecisionCode.QuantityLimit, "order quantity exceeds limit");
            var signedQuantity = action == SignalAction.EnterLong ? quantity : -quantity;
            if (Math.Abs(snapshot.CurrentPosition + signedQuantity) > limits.MaximumAbsolutePosition)
                return new Decision(DecisionCode.PositionLimit, "resulting position exceeds limit");
            if (snapshot.RealizedPnl <= -limits.MaximumDailyLoss)
                return new Decision(DecisionCode.DailyLossLimit, "daily loss limit reached");
            if (snapshot.AcceptedSignalsThisSession >= limits.MaximumSignalsPerSession)
                return new Decision(DecisionCode.SessionSignalLimit, "session signal limit reached");
            return Decision.Allow();
        }
    }
}
