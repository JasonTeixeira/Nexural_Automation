#region Using declarations
using System;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using NinjaTrader.Cbi;
using NinjaTrader.Data;
using NinjaTrader.Gui.Tools;
using NinjaTrader.NinjaScript;
using NinjaTrader.NinjaScript.Indicators;
#endregion

namespace NinjaTrader.NinjaScript.Strategies
{
	public class NexJMATrendStrategy : Strategy
	{
		private NexJMA jma;

		[NinjaScriptProperty]
		[Range(1, 200)]
		[Display(Name = "JMA Length", Order = 1, GroupName = "JMA")]
		public int JmaLength { get; set; }

		[NinjaScriptProperty]
		[Range(-100, 100)]
		[Display(Name = "JMA Phase", Order = 2, GroupName = "JMA")]
		public int JmaPhase { get; set; }

		[NinjaScriptProperty]
		[Range(1, 10)]
		[Display(Name = "JMA Power", Order = 3, GroupName = "JMA")]
		public int JmaPower { get; set; }

		[NinjaScriptProperty]
		[Range(1, 100)]
		[Display(Name = "Quantity", Order = 1, GroupName = "Trade")]
		public int Quantity { get; set; }

		[NinjaScriptProperty]
		[Range(1, 100)]
		[Display(Name = "Stop Loss (ticks)", Order = 2, GroupName = "Trade")]
		public int StopLossTicks { get; set; }

		[NinjaScriptProperty]
		[Range(1, 200)]
		[Display(Name = "Profit Target (ticks)", Order = 3, GroupName = "Trade")]
		public int ProfitTargetTicks { get; set; }

		[NinjaScriptProperty]
		[Display(Name = "Exit On JMA Flip", Order = 4, GroupName = "Trade")]
		public bool ExitOnJmaFlip { get; set; }

		[NinjaScriptProperty]
		[Display(Name = "Use Time Filter", Order = 1, GroupName = "Session")]
		public bool UseTimeFilter { get; set; }

		[NinjaScriptProperty]
		[Range(0, 2359)]
		[Display(Name = "Start Time HHmm", Order = 2, GroupName = "Session")]
		public int StartTimeHHmm { get; set; }

		[NinjaScriptProperty]
		[Range(0, 2359)]
		[Display(Name = "End Time HHmm", Order = 3, GroupName = "Session")]
		public int EndTimeHHmm { get; set; }

		[NinjaScriptProperty]
		[Range(1, 20)]
		[Display(Name = "Max Trades Per Day", Order = 4, GroupName = "Session")]
		public int MaxTradesPerDay { get; set; }

		private int tradesToday;
		private DateTime currentSessionDate;

		protected override void OnStateChange()
		{
			if (State == State.SetDefaults)
			{
				Name = "NexJMATrendStrategy";
				Description = "Trend-following futures strategy using NexJMA.";

				Calculate = Calculate.OnBarClose;
				EntriesPerDirection = 1;
				EntryHandling = EntryHandling.AllEntries;
				IsExitOnSessionCloseStrategy = true;
				ExitOnSessionCloseSeconds = 30;
				IsFillLimitOnTouch = false;
				MaximumBarsLookBack = MaximumBarsLookBack.TwoHundredFiftySix;
				OrderFillResolution = OrderFillResolution.Standard;
				Slippage = 0;
				StartBehavior = StartBehavior.WaitUntilFlat;
				TimeInForce = TimeInForce.Gtc;
				TraceOrders = false;
				RealtimeErrorHandling = RealtimeErrorHandling.StopCancelClose;
				StopTargetHandling = StopTargetHandling.PerEntryExecution;
				BarsRequiredToTrade = 20;
				IsInstantiatedOnEachOptimizationIteration = true;

				JmaLength = 7;
				JmaPhase = 50;
				JmaPower = 2;

				Quantity = 1;
				StopLossTicks = 12;
				ProfitTargetTicks = 24;
				ExitOnJmaFlip = true;

				UseTimeFilter = true;
				StartTimeHHmm = 930;
				EndTimeHHmm = 1530;
				MaxTradesPerDay = 3;
			}
			else if (State == State.DataLoaded)
			{
				jma = NexJMA(Close, JmaLength, JmaPhase, JmaPower, true);

				SetStopLoss(CalculationMode.Ticks, StopLossTicks);
				SetProfitTarget(CalculationMode.Ticks, ProfitTargetTicks);
			}
		}

		protected override void OnBarUpdate()
		{
			if (CurrentBar < BarsRequiredToTrade)
				return;

			if (Bars.IsFirstBarOfSession)
			{
				tradesToday = 0;
				currentSessionDate = Time[0].Date;
			}

			if (UseTimeFilter)
			{
				int currentTime = ToTime(Time[0]) / 100;
				if (currentTime < StartTimeHHmm || currentTime > EndTimeHHmm)
					return;
			}

			if (tradesToday >= MaxTradesPerDay)
				return;

			bool jmaUp = jma[0] > jma[1];
			bool jmaDown = jma[0] < jma[1];

			bool closeAboveJma = Close[0] > jma[0];
			bool closeBelowJma = Close[0] < jma[0];

			if (Position.MarketPosition == MarketPosition.Flat)
			{
				if (jmaUp && closeAboveJma)
				{
					EnterLong(Quantity, "LongJMA");
					tradesToday++;
				}
				else if (jmaDown && closeBelowJma)
				{
					EnterShort(Quantity, "ShortJMA");
					tradesToday++;
				}
			}

			if (ExitOnJmaFlip)
			{
				if (Position.MarketPosition == MarketPosition.Long && jmaDown)
					ExitLong("ExitLongFlip", "LongJMA");

				if (Position.MarketPosition == MarketPosition.Short && jmaUp)
					ExitShort("ExitShortFlip", "ShortJMA");
			}
		}
	}
}
