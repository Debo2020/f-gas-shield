import { useState, useEffect } from "react";
import { Clock, Calendar } from "lucide-react";
import { format } from "date-fns";

interface LiveClockProps {
  showDate?: boolean;
  showGreeting?: boolean;
  userName?: string;
  className?: string;
}

export function LiveClock({ showDate = true, showGreeting = false, userName, className }: LiveClockProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = time.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const hours = format(time, "HH");
  const minutes = format(time, "mm");
  const seconds = format(time, "ss");

  return (
    <div className={`flex flex-col items-end gap-1 ${className}`}>
      {showGreeting && userName && (
        <p className="text-sm text-muted-foreground">
          {getGreeting()}, <span className="font-medium text-foreground">{userName}</span>
        </p>
      )}
      <div className="flex items-center gap-4">
        {showDate && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>{format(time, "EEEE, d MMMM yyyy")}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 font-mono text-sm">
          <Clock className="h-3.5 w-3.5 text-primary animate-pulse" />
          <span className="tabular-nums">
            {hours}:{minutes}:
            <span className="text-primary">{seconds}</span>
          </span>
          <span className="text-xs text-muted-foreground">GMT</span>
        </div>
      </div>
    </div>
  );
}
