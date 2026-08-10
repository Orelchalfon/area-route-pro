import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { isFilterJob } from "@/lib/idConventions";
import { Customer, Job } from "@/types";
import { Save, X } from "lucide-react";
import { useState } from "react";
import {
  JobDetailsDraft,
  PlaceCoords,
  jobDetailsDraft,
} from "../hooks/useJobDetailsSave";

/**
 * Inline editor for a picker row. Rendered as a SIBLING of the row's <label> — putting
 * inputs inside it would fight the checkbox's implicit click forwarding — and every
 * click is stopped from bubbling so editing never toggles the selection.
 *
 * Targets are deliberately large (h-11 / text-base): the people scheduling with this
 * are not power users.
 */
export function PickerJobEditForm({
  job,
  customer,
  isSaving,
  onSave,
  onCancel,
}: {
  job: Job;
  customer?: Customer;
  isSaving: boolean;
  onSave: (draft: JobDetailsDraft, coords: PlaceCoords | null) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<JobDetailsDraft>(() =>
    jobDetailsDraft(job, customer),
  );
  const [coords, setCoords] = useState<PlaceCoords | null>(null);

  const patch = (next: Partial<JobDetailsDraft>) =>
    setDraft((d) => ({ ...d, ...next }));

  return (
    <div
      className='space-y-3 border-t border-border bg-muted/20 p-3'
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}>
      <div className='space-y-1.5'>
        <Label htmlFor={`edit-phone-${job.id}`}>טלפון</Label>
        <Input
          id={`edit-phone-${job.id}`}
          type='tel'
          dir='ltr'
          className='h-11 text-base'
          value={draft.phone}
          onChange={(e) => patch({ phone: e.target.value })}
          placeholder='מספר טלפון'
        />
      </div>

      <div className='space-y-1.5'>
        <Label>כתובת</Label>
        <AddressAutocomplete
          value={draft.location}
          onChange={(val) => {
            patch({ location: val });
            setCoords(null);
          }}
          onPlaceSelect={(place) => {
            patch({ location: place.address, city: place.city });
            setCoords({
              lat: place.lat,
              lng: place.lng,
              placeId: place.placeId,
            });
          }}
          placeholder='הקלד כתובת...'
          className='h-11 text-base'
        />
      </div>

      <div className='space-y-1.5'>
        <Label htmlFor={`edit-city-${job.id}`}>עיר</Label>
        <Input
          id={`edit-city-${job.id}`}
          className='h-11 text-base'
          value={draft.city}
          onChange={(e) => {
            patch({ city: e.target.value });
            setCoords(null);
          }}
          placeholder='עיר'
        />
      </div>

      <div className='space-y-1.5'>
        <Label htmlFor={`edit-desc-${job.id}`}>תיאור</Label>
        <Textarea
          id={`edit-desc-${job.id}`}
          className='text-base'
          rows={2}
          value={draft.description}
          onChange={(e) => patch({ description: e.target.value })}
          placeholder='מה צריך לעשות'
          // A synthetic filter reminder has no row of its own to hold a description.
          disabled={isFilterJob(job.id)}
        />
        {isFilterJob(job.id) && (
          <p className='text-xs text-muted-foreground'>
            שירות שנתי — השינוי נשמר בכרטיס הלקוח.
          </p>
        )}
      </div>

      <div className='flex gap-2'>
        <Button
          className='h-11 flex-1 gap-1.5 text-base'
          disabled={isSaving}
          onClick={() => onSave(draft, coords)}>
          <Save className='w-4 h-4' />
          {isSaving ? "שומר..." : "שמור"}
        </Button>
        <Button
          variant='outline'
          className='h-11 flex-1 gap-1.5 text-base'
          disabled={isSaving}
          onClick={onCancel}>
          <X className='w-4 h-4' />
          ביטול
        </Button>
      </div>
    </div>
  );
}
