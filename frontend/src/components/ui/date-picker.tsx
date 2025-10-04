import * as React from "react";
import { ChevronLeft, ChevronRight, Calendar, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Input } from "./input";

interface DatePickerProps {
  startDate?: string;
  endDate?: string;
  onDateChange: (startDate: string, endDate: string) => void;
  placeholder?: string;
  className?: string;
}

const DatePicker: React.FC<DatePickerProps> = ({
  startDate,
  endDate,
  onDateChange,
  placeholder = "Select date range",
  className,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const [tempStartDate, setTempStartDate] = React.useState<string | null>(null);
  const [tempEndDate, setTempEndDate] = React.useState<string | null>(null);
  const [viewMode, setViewMode] = React.useState<"calendar" | "manual">(
    "calendar"
  );

  const formatDate = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  const formatDisplayDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const isDateInRange = (
    date: Date,
    start: string | null,
    end: string | null
  ) => {
    if (!start || !end) return false;
    const dateStr = formatDate(date);
    return dateStr >= start && dateStr <= end;
  };

  const isDateSelected = (date: Date, selectedDate: string | null) => {
    if (!selectedDate) return false;
    return formatDate(date) === selectedDate;
  };

  const handleDateClick = (date: Date) => {
    const dateStr = formatDate(date);

    if (!tempStartDate || (tempStartDate && tempEndDate)) {
      // Start new selection
      setTempStartDate(dateStr);
      setTempEndDate(null);
    } else if (tempStartDate && !tempEndDate) {
      // Complete the range
      if (dateStr < tempStartDate) {
        setTempEndDate(tempStartDate);
        setTempStartDate(dateStr);
      } else {
        setTempEndDate(dateStr);
      }
    }
  };

  const handleApply = () => {
    if (tempStartDate && tempEndDate) {
      onDateChange(tempStartDate, tempEndDate);
      setIsOpen(false);
    }
  };

  // Initialize temp dates when opening
  React.useEffect(() => {
    if (isOpen) {
      setTempStartDate(startDate || null);
      setTempEndDate(endDate || null);
    }
  }, [isOpen, startDate, endDate]);

  const handleClear = () => {
    setTempStartDate(null);
    setTempEndDate(null);
    onDateChange("", "");
    setIsOpen(false);
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth((prev) => {
      const newMonth = new Date(prev);
      if (direction === "prev") {
        newMonth.setMonth(prev.getMonth() - 1);
      } else {
        newMonth.setMonth(prev.getMonth() + 1);
      }
      return newMonth;
    });
  };

  const getMonthName = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

  const days = getDaysInMonth(currentMonth);
  const weekDays = ["S", "M", "T", "W", "T", "F", "S"];

  const displayText = () => {
    if (startDate && endDate) {
      if (startDate === endDate) {
        return formatDisplayDate(startDate);
      }
      return `${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}`;
    }
    return placeholder;
  };

  return (
    <div className={cn("relative", className)}>
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-start text-left font-normal"
      >
        <Calendar className="mr-2 h-4 w-4" />
        {displayText()}
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 z-50 mt-2 w-80 rounded-lg border bg-white p-4 shadow-lg dark:bg-gray-800 dark:border-gray-700 max-h-96 overflow-y-auto">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">Select Date Range</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* View Mode Toggle */}
            <div className="mb-4 flex space-x-2">
              <Button
                variant={viewMode === "calendar" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("calendar")}
                className="flex-1"
              >
                Calendar
              </Button>
              <Button
                variant={viewMode === "manual" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("manual")}
                className="flex-1"
              >
                Manual Input
              </Button>
            </div>

            {/* Calendar View */}
            {viewMode === "calendar" && (
              <>
                {/* Month Navigation */}
                <div className="mb-4 flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigateMonth("prev")}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <h3 className="font-medium">{getMonthName(currentMonth)}</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigateMonth("next")}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                {/* Calendar Grid */}
                <div className="mb-4">
                  {/* Week day headers */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {weekDays.map((day) => (
                      <div
                        key={day}
                        className="text-center text-sm font-medium text-gray-500 py-2"
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar days */}
                  <div className="grid grid-cols-7 gap-1">
                    {days.map((day, index) => {
                      if (!day) {
                        return <div key={index} className="h-8" />;
                      }

                      const isInRange = isDateInRange(
                        day,
                        tempStartDate,
                        tempEndDate
                      );
                      const isStart = isDateSelected(day, tempStartDate);
                      const isEnd = isDateSelected(day, tempEndDate);
                      const isToday =
                        formatDate(day) === formatDate(new Date());

                      return (
                        <button
                          key={index}
                          onClick={() => handleDateClick(day)}
                          className={cn(
                            "h-8 w-8 rounded-full text-sm transition-colors",
                            "hover:bg-gray-100 dark:hover:bg-gray-700",
                            isToday && "font-semibold",
                            isInRange && "bg-blue-100 dark:bg-blue-900",
                            isStart &&
                              "bg-blue-500 text-white hover:bg-blue-600",
                            isEnd && "bg-blue-500 text-white hover:bg-blue-600",
                            !isInRange &&
                              !isStart &&
                              !isEnd &&
                              "hover:bg-gray-100"
                          )}
                        >
                          {day.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Manual Input View */}
            {viewMode === "manual" && (
              <div className="mb-4 space-y-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    From Date
                  </label>
                  <Input
                    type="date"
                    value={tempStartDate || ""}
                    onChange={(e) => setTempStartDate(e.target.value || null)}
                    placeholder="Select start date"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    To Date
                  </label>
                  <Input
                    type="date"
                    value={tempEndDate || ""}
                    onChange={(e) => setTempEndDate(e.target.value || null)}
                    placeholder="Select end date"
                  />
                </div>
              </div>
            )}

            {/* Quick Presets */}
            <div className="mb-4">
              <p className="text-sm font-medium mb-2">Quick Select:</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date();
                    const dateStr = today.toISOString().split("T")[0];
                    setTempStartDate(dateStr);
                    setTempEndDate(dateStr);
                  }}
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date();
                    const yesterday = new Date(today);
                    yesterday.setDate(yesterday.getDate() - 1);
                    const dateStr = yesterday.toISOString().split("T")[0];
                    setTempStartDate(dateStr);
                    setTempEndDate(dateStr);
                  }}
                >
                  Yesterday
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date();
                    const last7Days = new Date(today);
                    last7Days.setDate(last7Days.getDate() - 7);
                    setTempStartDate(last7Days.toISOString().split("T")[0]);
                    setTempEndDate(today.toISOString().split("T")[0]);
                  }}
                >
                  Last 7 days
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date();
                    const last30Days = new Date(today);
                    last30Days.setDate(last30Days.getDate() - 30);
                    setTempStartDate(last30Days.toISOString().split("T")[0]);
                    setTempEndDate(today.toISOString().split("T")[0]);
                  }}
                >
                  Last 30 days
                </Button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between space-x-2">
              <Button
                variant="outline"
                onClick={handleClear}
                className="flex-1"
              >
                Clear
              </Button>
              <Button
                onClick={handleApply}
                disabled={!tempStartDate || !tempEndDate}
                className="flex-1"
              >
                Apply
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export { DatePicker };
