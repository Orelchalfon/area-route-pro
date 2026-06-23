import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { technicians } from "@/data/mockData";
import { Customer, JobType } from "@/types";
import { Plus } from "lucide-react";
import { useCallback, useState } from "react";
import { AddressAutocomplete } from "./AddressAutocomplete";
import { CustomerSearchField } from "./CustomerSearchField";

type AddCustomerData = {
  name: string;
  phone: string;
  address: string;
  city: string;
  email: string;
  product: string;
  lat?: number;
  lng?: number;
  placeId?: string;
};

interface NewJobDialogProps {
  customers: Customer[];
  onAdd: (data: {
    type: JobType;
    customerId: string;
    technicianId: string;
    scheduledDate: string;
    scheduledTime: string;
    notes: string;
    location?: string;
    city?: string;
  }) => void;
  onAddCustomer: (data: AddCustomerData) => Customer;
}

function JobFormFields({
  customers,
  customerId,
  setCustomerId,
  technicianId,
  setTechnicianId,
  scheduledDate,
  setScheduledDate,
  scheduledTime,
  setScheduledTime,
  notes,
  setNotes,
}: {
  customers: Customer[];
  customerId: string;
  setCustomerId: (v: string) => void;
  technicianId: string;
  setTechnicianId: (v: string) => void;
  scheduledDate: string;
  setScheduledDate: (v: string) => void;
  scheduledTime: string;
  setScheduledTime: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
}) {
  return (
    <>
      <CustomerSearchField
        customers={customers}
        customerId={customerId}
        setCustomerId={setCustomerId}
      />

      <div className='space-y-2'>
        <Label>טכנאי</Label>
        <Select value={technicianId} onValueChange={setTechnicianId}>
          <SelectTrigger>
            <SelectValue placeholder='בחר טכנאי' />
          </SelectTrigger>
          <SelectContent>
            {technicians.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name} - {t.region}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className='grid grid-cols-2 gap-3'>
        <div className='space-y-2'>
          <Label>תאריך</Label>
          <Input
            type='date'
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
          />
        </div>
        <div className='space-y-2'>
          <Label>שעה</Label>
          <Input
            type='time'
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
          />
        </div>
      </div>

      <div className='space-y-2'>
        <Label>הערות</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder='הערות נוספות...'
        />
      </div>

      <p className='text-xs text-muted-foreground'>
        השארת טכנאי/תאריך ריקים תשמור את הפנייה ב"ממתינים לשיבוץ" — היא לא תיכנס ללוח עד שתשובץ.
      </p>
    </>
  );
}

export function NewJobDialog({
  customers,
  onAdd,
  onAddCustomer,
}: NewJobDialogProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("malfunction");
  const [customerId, setCustomerId] = useState("");
  const [technicianId, setTechnicianId] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [notes, setNotes] = useState("");

  // Non-customer installation fields
  const [isNonCustomer, setIsNonCustomer] = useState(false);
  const [ncName, setNcName] = useState("");
  const [ncPhone, setNcPhone] = useState("");
  const [ncAddress, setNcAddress] = useState("");
  const [ncCity, setNcCity] = useState("");
  const [ncOrderDetails, setNcOrderDetails] = useState("");
  const [lat, setLat] = useState<number | undefined>();
  const [lng, setLng] = useState<number | undefined>();
  const [placeId, setPlaceId] = useState<string | undefined>();

  const resetForm = () => {
    setCustomerId("");
    setTechnicianId("");
    setScheduledDate("");
    setScheduledTime("");
    setNotes("");
    setIsNonCustomer(false);
    setNcName("");
    setNcPhone("");
    setNcAddress("");
    setNcCity("");
    setNcOrderDetails("");
    setLat(undefined);
    setLng(undefined);
    setPlaceId(undefined);
  };

  const handlePlaceSelect = useCallback(
    (place: {
      address: string;
      city: string;
      lat: number;
      lng: number;
      placeId: string;
    }) => {
      setNcAddress(place.address);
      setNcCity(place.city);
      setLat(place.lat);
      setLng(place.lng);
      setPlaceId(place.placeId);
    },
    [],
  );

  const handleSubmit = (type: JobType) => {
    // Only the customer is required — leaving technician/date empty creates the
    // request unscheduled (it lands in "ממתינים לשיבוץ", off the board).
    if (!customerId) return;
    onAdd({
      type,
      customerId,
      technicianId,
      scheduledDate,
      scheduledTime,
      notes,
    });
    setOpen(false);
    resetForm();
  };

  const handleNonCustomerSubmit = () => {
    if (!ncName || !ncPhone || !ncAddress) return;
    const cust = onAddCustomer({
      name: ncName,
      phone: ncPhone,
      address: ncAddress,
      city: ncCity,
      email: "",
      product: ncOrderDetails,
      lat,
      lng,
      placeId,
    });
    onAdd({
      type: "installation",
      customerId: cust.id,
      technicianId: "",
      scheduledDate,
      scheduledTime,
      notes,
      location: ncAddress,
      city: ncCity,
    });
    setOpen(false);
    resetForm();
  };

  const isDisabled = !customerId;
  const isNonCustomerDisabled = !ncName || !ncPhone || !ncAddress;

  const formProps = {
    customers,
    customerId,
    setCustomerId,
    technicianId,
    setTechnicianId,
    scheduledDate,
    setScheduledDate,
    scheduledTime,
    setScheduledTime,
    notes,
    setNotes,
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetForm();
      }}>
      <DialogTrigger asChild>
        <Button className='gap-1.5'>
          <Plus className='w-4 h-4' />
          פניה חדשה
        </Button>
      </DialogTrigger>
      <DialogContent dir='rtl' className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>פניה חדשה</DialogTitle>
          <DialogDescription>בחר סוג פניה ומלא את הפרטים</DialogDescription>
        </DialogHeader>
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          dir='rtl'
          className='mt-2'>
          <TabsList className='w-full grid grid-cols-3'>
            <TabsTrigger value='malfunction'>תקלה</TabsTrigger>
            <TabsTrigger value='installation'>התקנה</TabsTrigger>
            <TabsTrigger value='filter_replacement'>שירות שוטף</TabsTrigger>
          </TabsList>

          <TabsContent value='malfunction' className='space-y-4 mt-4'>
            <JobFormFields {...formProps} />
            <Button
              onClick={() => handleSubmit("malfunction")}
              className='w-full'
              disabled={isDisabled}>
              שמור תקלה
            </Button>
          </TabsContent>

          <TabsContent value='installation' className='space-y-4 mt-4'>
            <div className='flex items-center gap-2'>
              <Checkbox
                id='non-customer'
                checked={isNonCustomer}
                onCheckedChange={(v) => setIsNonCustomer(v === true)}
              />
              <Label htmlFor='non-customer' className='cursor-pointer'>
                לא לקוח
              </Label>
            </div>

            {isNonCustomer ? (
              <>
                <div className='space-y-2'>
                  <Label>שם הלקוח</Label>
                  <Input
                    value={ncName}
                    onChange={(e) => setNcName(e.target.value)}
                    placeholder='שם מלא'
                  />
                </div>
                <div className='space-y-2'>
                  <Label>טלפון</Label>
                  <Input
                    value={ncPhone}
                    onChange={(e) => setNcPhone(e.target.value)}
                    placeholder='+972-50-0000000'
                  />
                </div>
                <div className='space-y-2'>
                  <Label>כתובת מלאה</Label>
                  <AddressAutocomplete
                    value={ncAddress}
                    onChange={setNcAddress}
                    onPlaceSelect={handlePlaceSelect}
                    placeholder='הקלד כתובת...'
                  />
                  {placeId && (
                    <p className='text-xs text-muted-foreground'>
                      📍 כתובת מאומתת
                    </p>
                  )}
                </div>
                <div className='space-y-2'>
                  <Label>פרטי ההזמנה</Label>
                  <Textarea
                    value={ncOrderDetails}
                    onChange={(e) => setNcOrderDetails(e.target.value)}
                    placeholder='פרטי ההזמנה / המוצר...'
                  />
                </div>
                <div className='grid grid-cols-2 gap-3'>
                  <div className='space-y-2'>
                    <Label>תאריך</Label>
                    <Input
                      type='date'
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label>שעה</Label>
                    <Input
                      type='time'
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                    />
                  </div>
                </div>
                <div className='space-y-2'>
                  <Label>הערות</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder='הערות נוספות...'
                  />
                </div>
                <Button
                  onClick={handleNonCustomerSubmit}
                  className='w-full'
                  disabled={isNonCustomerDisabled}>
                  שמור התקנה
                </Button>
              </>
            ) : (
              <>
                <JobFormFields {...formProps} />
                <Button
                  onClick={() => handleSubmit("installation")}
                  className='w-full'
                  disabled={isDisabled}>
                  שמור התקנה
                </Button>
              </>
            )}
          </TabsContent>

          <TabsContent value='filter_replacement' className='space-y-4 mt-4'>
            <JobFormFields {...formProps} />
            <Button
              onClick={() => handleSubmit("filter_replacement")}
              className='w-full'
              disabled={isDisabled}>
              שמור שירות שוטף
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
