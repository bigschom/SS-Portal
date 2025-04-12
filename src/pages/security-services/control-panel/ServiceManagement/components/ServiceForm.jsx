import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, Save, X } from 'lucide-react';

export const ServiceForm = ({ service, onSave, onCancel, saving }) => {
  const defaultValues = {
    service_type: service?.service_type || '',
    description: service?.description || '',
    sla_hours: service?.sla_hours || 24,
    is_visible: service?.is_visible ?? true
  };

  const { register, handleSubmit, watch, setValue } = useForm({
    defaultValues
  });

  const onSubmit = async (data) => {
    try {
      await onSave({
        ...data,
        sla_hours: Number(data.sla_hours)
      });
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const isVisible = watch('is_visible');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Service Type</Label>
          <Input 
            {...register('service_type')}
            placeholder="Enter service type (e.g., check_status)"
            disabled={saving || !!service}
          />
          <p className="text-sm text-muted-foreground">
            Use snake_case format (e.g., check_status)
          </p>
        </div>

        <div className="space-y-2">
          <Label>Description</Label>
          <Input 
            {...register('description')}
            placeholder="Enter service description"
            disabled={saving}
          />
        </div>

        <div className="space-y-2">
          <Label>SLA Hours</Label>
          <Input 
            type="number"
            min={1}
            max={168}
            {...register('sla_hours')}
            placeholder="Enter SLA hours"
            disabled={saving}
          />
          <p className="text-sm text-muted-foreground">
            Maximum time allowed to complete this service request (1-168 hours)
          </p>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label>Visible</Label>
            <p className="text-sm text-muted-foreground">
              Make this service visible to users
            </p>
          </div>
          <Switch
            checked={isVisible}
            onCheckedChange={(checked) => setValue('is_visible', checked)}
            disabled={saving}
          />
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={saving}
        >
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={saving}
        >
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {service ? 'Update' : 'Create'} Service
        </Button>
      </div>
    </form>
  );
};
