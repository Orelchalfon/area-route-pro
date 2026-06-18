import { useState } from 'react';
import { Job, JOB_TYPE_CONFIG, Customer } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pencil, Save, X, Navigation, GripVertical, Filter, AlertTriangle, Wrench, Clock } from 'lucide-react';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { useGoogleMapsKey } from '@/hooks/useGoogleMapsKey';
import { geocodeAddress } from '@/lib/geocodeAddress';
import type { DraggableProvidedDragHandleProps } from '@hello-pangea/dnd';

const typeIcons: Record<string, React.ReactNode> = {
  filter_replacement: <Filter className="w-3.5 h-3.5" />,
  malfunction: <AlertTriangle className="w-3.5 h-3.5" />,
  installation: <Wrench className="w-3.5 h-3.5" />,
};

interface EditForm {
  location: string;
  city: string;
  notes: string;
  estimatedDuration: number;
}

interface EditableRouteStopProps {
  job: Job;
  customer: Customer | undefined;
  index: number;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (jobId: string, customerId: string, jobData: Partial<Pick<Job, 'location' | 'city' | 'notes' | 'estimatedDuration'>>, customerData: Partial<Customer>) => void;
  dragHandleProps?: DraggableProvidedDragHandleProps | null;
  isDragging?: boolean;
  showTime?: boolean;
  readOnly?: boolean;
}

export function EditableRouteStop({
  job, customer, index, isEditing, onStartEdit, onCancelEdit, onSave,
  dragHandleProps, isDragging, showTime, readOnly,
}: EditableRouteStopProps) {
  const { fetchKey } = useGoogleMapsKey();
  const isDone = job.completionStatus === 'done';
  const [form, setForm] = useState<EditForm>({
    location: job.location || customer?.address || '',
    city: job.city || customer?.city || '',
    notes: job.notes || '',
    estimatedDuration: job.estimatedDuration,
  });
  const [pendingCoords, setPendingCoords] = useState<{ lat: number; lng: number; placeId?: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handlePlaceSelect = (place: { address: string; city: string; lat: number; lng: number; placeId: string }) => {
    setForm(f => ({ ...f, location: place.address, city: place.city }));
    setPendingCoords({ lat: place.lat, lng: place.lng, placeId: place.placeId });
  };

  const handleSave = async () => {
    if (!customer || isSaving) return;

    const currentLocation = (customer.address || job.location || '').trim();
    const currentCity = (customer.city || job.city || '').trim();
    const hasManualLocationChange = !pendingCoords && (
      form.location.trim() !== currentLocation ||
      form.city.trim() !== currentCity
    );

    const jobData: Partial<Pick<Job, 'location' | 'city' | 'notes' | 'estimatedDuration'>> = {
      location: form.location,
      city: form.city,
      notes: form.notes,
      estimatedDuration: form.estimatedDuration,
    };

    const customerData: Partial<Customer> = {
      address: form.location,
      city: form.city,
    };

    setIsSaving(true);

    try {
      if (pendingCoords) {
        customerData.lat = pendingCoords.lat;
        customerData.lng = pendingCoords.lng;
        if (pendingCoords.placeId) customerData.placeId = pendingCoords.placeId;
      } else if (hasManualLocationChange) {
        const geocoded = await geocodeAddress(
          [form.location, form.city].filter(Boolean).join(', '),
          await fetchKey()
        );

        if (geocoded) {
          customerData.lat = geocoded.lat;
          customerData.lng = geocoded.lng;
          if (geocoded.placeId) customerData.placeId = geocoded.placeId;
        } else {
          customerData.lat = undefined;
          customerData.lng = undefined;
          customerData.placeId = undefined;
        }
      }

      onSave(job.id, customer.id, jobData, customerData);
    } finally {
      setIsSaving(false);
    }
  };

  const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent((customer?.address || job.location || '') + ', ' + (customer?.city || job.city || ''))}`;

  return (
    <div className={`rounded-lg border transition-colors ${
      isDragging ? 'bg-primary/5 border-primary/40 shadow-lg' : isDone ? 'bg-success/5 border-success/30' : 'bg-card border-border hover:bg-muted/30'
    }`}>
      <div className="flex items-start gap-2 p-3">
        {dragHandleProps && (
          <div {...dragHandleProps} className="pt-1 cursor-grab active:cursor-grabbing">
            <GripVertical className="w-4 h-4 text-muted-foreground/50" />
          </div>
        )}
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${isDone ? 'bg-success' : 'bg-primary'}`}>
          {isDone ? '✓' : index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${isDone ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
            {customer?.name}
          </p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
            {typeIcons[job.type]}
            <span>{JOB_TYPE_CONFIG[job.type].label}</span>
            {showTime && job.scheduledTime && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <Clock className="w-3 h-3" />
                <span>{job.scheduledTime}</span>
              </>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground/60 mt-0.5 truncate">{customer?.address || job.location}</p>
        </div>
        {!isEditing && !readOnly && (
          <button
            onClick={onStartEdit}
            className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors shrink-0"
            title="ערוך"
          >
            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
        <a href={navUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors shrink-0" title="נווט">
          <Navigation className="w-4 h-4 text-primary" />
        </a>
      </div>

      {isEditing && (
        <div className="px-3 pb-3 space-y-2 border-t border-border pt-2">
          <div>
            <label className="text-[11px] text-muted-foreground">כתובת</label>
            <AddressAutocomplete
              value={form.location}
              onChange={val => {
                setForm(f => ({ ...f, location: val }));
                setPendingCoords(null);
              }}
              onPlaceSelect={handlePlaceSelect}
              placeholder="הקלד כתובת..."
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">עיר</label>
            <Input
              value={form.city}
              onChange={e => {
                setForm(f => ({ ...f, city: e.target.value }));
                setPendingCoords(null);
              }}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">הערות</label>
            <Input
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">משך (דקות)</label>
            <Input
              type="number"
              value={form.estimatedDuration}
              onChange={e => setForm(f => ({ ...f, estimatedDuration: Number(e.target.value) || 0 }))}
              className="h-8 text-sm w-24"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-1 h-7 text-xs">
              <Save className="w-3 h-3" /> {isSaving ? 'שומר...' : 'שמור'}
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancelEdit} disabled={isSaving} className="h-7 text-xs">
              <X className="w-3 h-3" /> ביטול
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
