import { CheckCircle2, CircleAlert, LoaderCircle } from 'lucide-react';

export default function EventTimeline({ events }) {
  return (
    <div className="event-list">
      {events.length === 0 && <div className="empty-events">No transmission started yet.</div>}
      {events.slice().reverse().map((event, index) => (
        <div className={`event-item ${event.type || 'info'}`} key={`${event.time}-${index}`}>
          {event.type === 'danger' ? <CircleAlert size={16} /> : event.type === 'pending' ? <LoaderCircle className="spin" size={16} /> : <CheckCircle2 size={16} />}
          <div><strong>{event.message}</strong><span>{event.time}</span></div>
        </div>
      ))}
    </div>
  );
}
