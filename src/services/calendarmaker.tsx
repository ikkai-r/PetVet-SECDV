import { useState } from "react";

type Appointment = {
  date: string; // ISO date string (e.g., "2024-12-05")
  title?: string;
};

type CalendarProps = {
  appointments: Appointment[];
  setSelectedDate: (date: Date) => void;
  selectedDate: Date | null;
};

const CalendarMaker: React.FC<CalendarProps> = ({
  appointments,
  setSelectedDate,
  selectedDate,
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startWeekday = firstDayOfMonth.getDay(); // 0 = Sunday

  const monthYearLabel = currentDate.toLocaleDateString("default", {
    month: "long",
    year: "numeric",
  });

  const changeMonth = (offset: number) => {
    const newDate = new Date(year, month + offset, 1);
    setCurrentDate(newDate);
  };

  return (
    <div className="p-6 pt-0">
      <div className="bg-card rounded-2xl p-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => changeMonth(-1)}
            className="text-sm text-muted-foreground hover:text-primary"
          >
            ← Previous
          </button>
          <h2 className="font-semibold">{monthYearLabel}</h2>
          <button
            onClick={() => changeMonth(1)}
            className="text-sm text-muted-foreground hover:text-primary"
          >
            Next →
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-sm">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="p-2 font-medium text-muted-foreground">
              {day}
            </div>
          ))}

          {Array.from({ length: startWeekday }).map((_, i) => (
            <div key={`empty-start-${i}`} />
          ))}

          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dateObj = new Date(year, month, day);
            const isSelected =
              selectedDate?.toDateString() === dateObj.toDateString();
            const hasAppointment = appointments.some(
              (apt) =>
                new Date(apt.date).toDateString() === dateObj.toDateString()
            );

            return (
              <div
                key={day}
                onClick={() => setSelectedDate(dateObj)}
                className={`p-2 rounded-lg relative cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-primary text-white"
                    : hasAppointment
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted"
                }`}
              >
                {day}
                {hasAppointment && (
                  <div className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
                )}
              </div>
            );
          })}

          {(() => {
            const totalDisplayed = startWeekday + daysInMonth;
            const trailingBlanks =
              totalDisplayed % 7 === 0 ? 0 : 7 - (totalDisplayed % 7);
            return Array.from({ length: trailingBlanks }).map((_, i) => (
              <div key={`empty-end-${i}`} />
            ));
          })()}
        </div>
      </div>
    </div>
  );
};

export default CalendarMaker;
