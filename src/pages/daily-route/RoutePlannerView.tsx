import { Button } from '@/components/ui/button';
import { EditableRouteStop } from '@/components/EditableRouteStop';
import { GoogleMapsPlanner } from '@/components/GoogleMapsPlanner';
import { Customer, Job } from '@/types';
import { DragDropContext, Draggable, Droppable, DropResult } from '@hello-pangea/dnd';
import { AlertTriangle, CheckCircle, ChevronDown, ChevronUp, MapPin, Save } from 'lucide-react';
import { JobWithCustomer } from './types';

export function RoutePlannerView({
  orderedJobs,
  isAdmin,
  routeSaved,
  editingJobId,
  keyLoading,
  keyError,
  apiKey,
  onSaveRoute,
  onDragEnd,
  onMove,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onRetryKey,
}: {
  orderedJobs: JobWithCustomer[];
  isAdmin: boolean;
  routeSaved: boolean;
  editingJobId: string | null;
  keyLoading: boolean;
  keyError: string | null;
  apiKey: string | null;
  onSaveRoute: () => void;
  onDragEnd: (result: DropResult) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onStartEdit: (jobId: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (
    jobId: string,
    customerId: string,
    jobData: Partial<Pick<Job, 'location' | 'city' | 'notes' | 'estimatedDuration'>>,
    customerData: Partial<Customer>,
  ) => void;
  onRetryKey: () => void;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4" style={{ direction: 'ltr' }}>
      {/* Sidebar - RIGHT side */}
      <div className="space-y-3 order-last" dir="rtl">
        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              סדר עצירות ({orderedJobs.length})
            </h3>
            {isAdmin && (
              <Button
                size="sm"
                onClick={onSaveRoute}
                disabled={routeSaved}
                className="gap-1.5"
              >
                {routeSaved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {routeSaved ? 'נשמר!' : 'שמור מסלול'}
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground">גרור כדי לשנות את סדר ההגעה</p>

          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="route-stops">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="space-y-2 max-h-[460px] overflow-y-auto"
                >
                  {orderedJobs.map((jc, idx) => (
                      <Draggable key={jc.job.id} draggableId={jc.job.id} index={idx}>
                        {(provided, snapshot) => (
                          <div ref={provided.innerRef} {...provided.draggableProps} className="flex items-stretch gap-1.5">
                            <div className="flex-1">
                              <EditableRouteStop
                                job={jc.job}
                                customer={jc.customer}
                                index={idx}
                                isEditing={editingJobId === jc.job.id}
                                onStartEdit={() => onStartEdit(jc.job.id)}
                                onCancelEdit={onCancelEdit}
                                onSave={onSaveEdit}
                                dragHandleProps={provided.dragHandleProps}
                                isDragging={snapshot.isDragging}
                                readOnly={!isAdmin}
                              />
                            </div>
                            {/* Touch reorder controls — drag still works on desktop */}
                            {isAdmin && (
                              <div className="flex flex-col justify-center gap-1 lg:hidden">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-11 w-11"
                                  aria-label="הזז למעלה"
                                  disabled={idx === 0}
                                  onClick={() => onMove(idx, -1)}
                                >
                                  <ChevronUp className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-11 w-11"
                                  aria-label="הזז למטה"
                                  disabled={idx === orderedJobs.length - 1}
                                  onClick={() => onMove(idx, 1)}
                                >
                                  <ChevronDown className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      </div>

      {/* Map - LEFT side */}
      <div className="rounded-xl overflow-hidden border border-border shadow-card order-first h-[50vh] md:h-[60vh] lg:h-[80vh]">
        {keyLoading ? (
          <div className="flex items-center justify-center h-full bg-muted/30">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">טוען מפה...</p>
            </div>
          </div>
        ) : keyError ? (
          <div className="flex items-center justify-center h-full bg-muted/30">
            <div className="text-center">
              <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-2" />
              <p className="text-sm text-destructive">שגיאה בטעינת המפה</p>
              <p className="text-xs text-muted-foreground mt-1">{keyError}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={onRetryKey}>נסה שוב</Button>
            </div>
          </div>
        ) : apiKey ? (
          <GoogleMapsPlanner
            apiKey={apiKey}
            stops={orderedJobs.map((jc, idx) => ({
              id: jc.job.id,
              position: { lat: jc.coords.lat, lng: jc.coords.lng },
              label: String(idx + 1),
              title: jc.customer?.name || '',
              type: jc.job.type,
              isDone: jc.job.completionStatus === 'done',
              customer: jc.customer,
              fullAddress: [jc.customer?.address, jc.customer?.city].filter(Boolean).join(', '),
            }))}
          />
        ) : null}
      </div>
    </div>
  );
}
