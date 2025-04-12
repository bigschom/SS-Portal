import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Users } from 'lucide-react';

export const ServiceList = ({ 
  services, 
  onVisibilityChange, 
  onManageAccess,
  loading 
}) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Service Type</TableHead>
          <TableHead>Description</TableHead>
          <TableHead className="text-center">SLA (Hours)</TableHead>
          <TableHead className="text-center">Visible</TableHead>
          <TableHead className="text-center">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {services.map((service) => (
          <TableRow key={service.id}>
            <TableCell className="font-medium">
              {service.service_type.replace(/_/g, ' ')}
            </TableCell>
            <TableCell>{service.description}</TableCell>
            <TableCell className="text-center">
              {service.sla_hours}
            </TableCell>
            <TableCell className="text-center">
              <Switch
                checked={service.is_visible}
                onCheckedChange={(checked) => 
                  onVisibilityChange(service.id, checked)
                }
                disabled={loading}
              />
            </TableCell>
            <TableCell className="text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onManageAccess(service)}
              >
                <Users className="w-4 h-4 mr-2" />
                Manage Access
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
