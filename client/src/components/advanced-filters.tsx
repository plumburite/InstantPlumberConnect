import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Star, 
  MapPin, 
  DollarSign, 
  Clock, 
  Shield, 
  Award,
  Filter,
  X
} from "lucide-react";
import { useSocket } from "@/hooks/use-socket";

interface FilterState {
  maxDistance: number;
  minRating: number;
  maxPrice: number;
  services: string[];
  availability: 'all' | 'available' | 'busy';
  certifications: string[];
  experienceYears: number;
  responseTime: 'immediate' | 'within_hour' | 'same_day';
}

interface AdvancedFiltersProps {
  onFiltersChange: (filters: FilterState) => void;
  onClose: () => void;
}

const SERVICE_TYPES = [
  'Pipe Repair',
  'Drain Cleaning', 
  'Leak Detection',
  'Water Heater',
  'Toilet Repair',
  'Faucet Repair',
  'Sewer Line',
  'Emergency Service',
  'Installation',
  'Inspection'
];

const CERTIFICATIONS = [
  'Licensed Plumber',
  'Master Plumber',
  'Journeyman Plumber',
  'EPA Certified',
  'OSHA Certified',
  'Green Plumbing',
  'Commercial Certified',
  'Residential Specialist'
];

export default function AdvancedFilters({ onFiltersChange, onClose }: AdvancedFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    maxDistance: 25,
    minRating: 0,
    maxPrice: 200,
    services: [],
    availability: 'all',
    certifications: [],
    experienceYears: 0,
    responseTime: 'same_day',
  });

  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const toggleService = (service: string) => {
    const newServices = filters.services.includes(service)
      ? filters.services.filter(s => s !== service)
      : [...filters.services, service];
    updateFilter('services', newServices);
  };

  const toggleCertification = (cert: string) => {
    const newCerts = filters.certifications.includes(cert)
      ? filters.certifications.filter(c => c !== cert)
      : [...filters.certifications, cert];
    updateFilter('certifications', newCerts);
  };

  const clearAllFilters = () => {
    const clearedFilters: FilterState = {
      maxDistance: 25,
      minRating: 0,
      maxPrice: 200,
      services: [],
      availability: 'all',
      certifications: [],
      experienceYears: 0,
      responseTime: 'same_day',
    };
    setFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Advanced Filters
        </CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={clearAllFilters}>
            Clear All
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Location & Distance */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Maximum Distance: {filters.maxDistance} miles
            </Label>
            <Slider
              value={[filters.maxDistance]}
              onValueChange={(value) => updateFilter('maxDistance', value[0])}
              max={100}
              min={1}
              step={5}
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Minimum Rating: {filters.minRating}+ stars
            </Label>
            <Slider
              value={[filters.minRating]}
              onValueChange={(value) => updateFilter('minRating', value[0])}
              max={5}
              min={0}
              step={0.5}
              className="w-full"
            />
          </div>
        </div>

        {/* Price & Experience */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Max Price: ${filters.maxPrice}
            </Label>
            <Slider
              value={[filters.maxPrice]}
              onValueChange={(value) => updateFilter('maxPrice', value[0])}
              max={500}
              min={50}
              step={25}
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              Min Experience: {filters.experienceYears}+ years
            </Label>
            <Slider
              value={[filters.experienceYears]}
              onValueChange={(value) => updateFilter('experienceYears', value[0])}
              max={30}
              min={0}
              step={1}
              className="w-full"
            />
          </div>
        </div>

        {/* Availability & Response Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Availability Status
            </Label>
            <Select value={filters.availability} onValueChange={(value: any) => updateFilter('availability', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plumbers</SelectItem>
                <SelectItem value="available">Available Now</SelectItem>
                <SelectItem value="busy">Busy (Can Schedule)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Response Time
            </Label>
            <Select value={filters.responseTime} onValueChange={(value: any) => updateFilter('responseTime', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">Immediate (&lt; 15 min)</SelectItem>
                <SelectItem value="within_hour">Within 1 Hour</SelectItem>
                <SelectItem value="same_day">Same Day</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Service Types */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Service Types</Label>
          <div className="flex flex-wrap gap-2">
            {SERVICE_TYPES.map((service) => (
              <Badge
                key={service}
                variant={filters.services.includes(service) ? "default" : "secondary"}
                className="cursor-pointer transition-colors"
                onClick={() => toggleService(service)}
                data-testid={`filter-service-${service.toLowerCase().replace(' ', '-')}`}
              >
                {service}
                {filters.services.includes(service) && (
                  <X className="h-3 w-3 ml-1" />
                )}
              </Badge>
            ))}
          </div>
        </div>

        {/* Certifications */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Certifications & Qualifications</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {CERTIFICATIONS.map((cert) => (
              <div key={cert} className="flex items-center space-x-2">
                <Checkbox
                  id={cert}
                  checked={filters.certifications.includes(cert)}
                  onCheckedChange={() => toggleCertification(cert)}
                  data-testid={`filter-cert-${cert.toLowerCase().replace(/\s+/g, '-')}`}
                />
                <Label htmlFor={cert} className="text-sm font-normal cursor-pointer">
                  {cert}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Applied Filters Summary */}
        {(filters.services.length > 0 || filters.certifications.length > 0 || filters.minRating > 0) && (
          <div className="p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-2">Active Filters:</h4>
            <div className="flex flex-wrap gap-2">
              {filters.minRating > 0 && (
                <Badge variant="outline">
                  {filters.minRating}+ ⭐ Rating
                </Badge>
              )}
              {filters.maxDistance < 25 && (
                <Badge variant="outline">
                  Within {filters.maxDistance} miles
                </Badge>
              )}
              {filters.maxPrice < 200 && (
                <Badge variant="outline">
                  Under ${filters.maxPrice}
                </Badge>
              )}
              {filters.experienceYears > 0 && (
                <Badge variant="outline">
                  {filters.experienceYears}+ years exp
                </Badge>
              )}
              {filters.availability !== 'all' && (
                <Badge variant="outline">
                  {filters.availability === 'available' ? 'Available Now' : 'Can Schedule'}
                </Badge>
              )}
              {filters.services.map((service) => (
                <Badge key={service} variant="outline">
                  {service}
                </Badge>
              ))}
              {filters.certifications.map((cert) => (
                <Badge key={cert} variant="outline">
                  {cert}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}