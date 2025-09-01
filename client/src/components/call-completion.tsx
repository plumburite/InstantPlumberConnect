import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { 
  Plus, DollarSign, FileText, Package, Settings, 
  Clock, User, CheckCircle, AlertCircle
} from "lucide-react";
import type { Service, Inventory, Customer } from "@shared/schema";

interface CallCompletionProps {
  callId: string;
  customerName: string;
  customerPhone?: string;
  onComplete: () => void;
  onCancel: () => void;
}

interface SelectedItem {
  type: 'service' | 'inventory';
  id: string;
  name: string;
  price: string;
  quantity: number;
  description: string;
}

export default function CallCompletion({ callId, customerName, customerPhone, onComplete, onCancel }: CallCompletionProps) {
  const { toast } = useToast();
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [callNotes, setCallNotes] = useState("");
  const [customerInfo, setCustomerInfo] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: customerPhone || "",
    address: "",
    city: "",
    state: "",
    zipCode: ""
  });
  const [createCustomer, setCreateCustomer] = useState(false);
  const [generateInvoice, setGenerateInvoice] = useState(false);
  const [step, setStep] = useState(1); // 1: Services, 2: Customer, 3: Summary

  // Data queries
  const { data: services = [] } = useQuery<Service[]>({ queryKey: ["/api/services/active"] });
  const { data: inventory = [] } = useQuery<Inventory[]>({ queryKey: ["/api/inventory"] });
  const { data: customers = [] } = useQuery<Customer[]>({ queryKey: ["/api/customers"] });

  // Find existing customer by phone
  const existingCustomer = customers.find((c: Customer) => c.phoneNumber === customerPhone);

  // Complete call mutation
  const completeCallMutation = useMutation({
    mutationFn: async (data: any) => {
      // First update the call with completion details
      await apiRequest("PATCH", `/api/calls/${callId}`, {
        status: "completed",
        endTime: new Date().toISOString(),
        ...data.callUpdate
      });

      // Create customer if needed
      let customerId = existingCustomer?.id;
      if (createCustomer && !existingCustomer) {
        const customerRes = await apiRequest("POST", "/api/customers", data.customerData);
        const newCustomer = await customerRes.json();
        customerId = newCustomer.id;
      }

      // Create invoice if requested
      if (generateInvoice && selectedItems.length > 0) {
        const subtotal = selectedItems.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
        const taxAmount = subtotal * 0.08; // 8% tax
        const totalAmount = subtotal + taxAmount;

        const invoiceRes = await apiRequest("POST", "/api/invoices", {
          callId,
          customerId,
          subtotal: subtotal.toFixed(2),
          taxAmount: taxAmount.toFixed(2),
          totalAmount: totalAmount.toFixed(2),
          notes: callNotes
        });
        const invoice = await invoiceRes.json();

        // Add line items to invoice
        for (const item of selectedItems) {
          await apiRequest("POST", `/api/invoices/${invoice.id}/items`, {
            serviceId: item.type === 'service' ? item.id : null,
            inventoryId: item.type === 'inventory' ? item.id : null,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.price,
            totalPrice: (parseFloat(item.price) * item.quantity).toFixed(2)
          });
        }
      }

      return { customerId, invoiceCreated: generateInvoice };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/plumber/calls"] });
      if (result.customerId) {
        queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      }
      if (result.invoiceCreated) {
        queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      }
      toast({ 
        title: "Call completed successfully", 
        description: result.invoiceCreated ? "Invoice has been generated" : "Call logged successfully"
      });
      onComplete();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to complete call", description: error.message, variant: "destructive" });
    },
  });

  const addService = (service: Service) => {
    const existingIndex = selectedItems.findIndex(item => item.id === service.id && item.type === 'service');
    if (existingIndex >= 0) {
      // Increase quantity if already added
      const updated = [...selectedItems];
      updated[existingIndex].quantity += 1;
      setSelectedItems(updated);
    } else {
      setSelectedItems(prev => [...prev, {
        type: 'service',
        id: service.id,
        name: service.name,
        price: service.basePrice,
        quantity: 1,
        description: service.name
      }]);
    }
  };

  const addInventoryItem = (item: Inventory) => {
    const existingIndex = selectedItems.findIndex(selected => selected.id === item.id && selected.type === 'inventory');
    if (existingIndex >= 0) {
      const updated = [...selectedItems];
      updated[existingIndex].quantity += 1;
      setSelectedItems(updated);
    } else {
      setSelectedItems(prev => [...prev, {
        type: 'inventory',
        id: item.id,
        name: item.name,
        price: item.unitPrice,
        quantity: 1,
        description: item.name
      }]);
    }
  };

  const removeItem = (index: number) => {
    setSelectedItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateItemQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(index);
      return;
    }
    const updated = [...selectedItems];
    updated[index].quantity = quantity;
    setSelectedItems(updated);
  };

  const calculateTotal = () => {
    const subtotal = selectedItems.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
    const tax = subtotal * 0.08;
    return { subtotal, tax, total: subtotal + tax };
  };

  const handleComplete = () => {
    const callUpdate = {
      notes: callNotes
    };

    const customerData = createCustomer ? {
      ...customerInfo,
      email: customerInfo.email || null,
      address: customerInfo.address || null,
      city: customerInfo.city || null,
      state: customerInfo.state || null,
      zipCode: customerInfo.zipCode || null,
    } : null;

    completeCallMutation.mutate({
      callUpdate,
      customerData
    });
  };

  const { subtotal, tax, total } = calculateTotal();

  if (step === 1) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="w-5 h-5 mr-2 text-accent" />
              Complete Call - Log Services
            </CardTitle>
            <p className="text-muted-foreground">Call with {customerName} • Select services and materials used</p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Services Used */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center">
                <Settings className="w-4 h-4 mr-2" />
                Services Provided
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {services.map((service: Service) => (
                  <Card 
                    key={service.id} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => addService(service)}
                    data-testid={`card-add-service-${service.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{service.name}</h4>
                          <p className="text-xs text-muted-foreground">{service.category}</p>
                          <p className="text-sm font-medium text-accent mt-1">${service.basePrice}</p>
                        </div>
                        <Plus className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Materials Used */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center">
                <Package className="w-4 h-4 mr-2" />
                Materials Used
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {inventory.filter((item: Inventory) => (item.quantityInStock || 0) > 0).map((item: Inventory) => (
                  <Card 
                    key={item.id} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => addInventoryItem(item)}
                    data-testid={`card-add-inventory-${item.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{item.name}</h4>
                          <p className="text-xs text-muted-foreground">{item.category}</p>
                          <p className="text-sm font-medium text-accent mt-1">${item.unitPrice}</p>
                          <p className="text-xs text-muted-foreground">Stock: {item.quantityInStock || 0}</p>
                        </div>
                        <Plus className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Selected Items */}
            {selectedItems.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Selected Items</h3>
                <div className="space-y-2">
                  {selectedItems.map((item, index) => (
                    <div key={`${item.type}-${item.id}-${index}`} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Badge variant={item.type === 'service' ? 'default' : 'secondary'}>
                          {item.type}
                        </Badge>
                        <div>
                          <span className="font-medium text-sm">{item.name}</span>
                          <p className="text-xs text-muted-foreground">${item.price} each</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 1)}
                          className="w-16 h-8 text-center"
                          data-testid={`input-quantity-${index}`}
                        />
                        <span className="text-sm font-medium w-16 text-right">
                          ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                        </span>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => removeItem(index)}
                          data-testid={`button-remove-item-${index}`}
                        >
                          ×
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Total */}
                <div className="mt-4 p-3 bg-accent/10 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax (8%):</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between font-semibold">
                    <span>Total:</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Call Notes */}
            <div>
              <Label htmlFor="callNotes">Call Notes</Label>
              <Textarea
                id="callNotes"
                placeholder="Describe the work performed, issues resolved, recommendations, etc."
                value={callNotes}
                onChange={(e) => setCallNotes(e.target.value)}
                rows={4}
                data-testid="input-call-notes"
              />
            </div>

            {/* Options */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="create-customer"
                  checked={createCustomer}
                  onCheckedChange={(checked) => setCreateCustomer(!!checked)}
                  data-testid="checkbox-create-customer"
                />
                <Label htmlFor="create-customer" className="text-sm">
                  Add customer to database
                  {existingCustomer && (
                    <span className="text-muted-foreground ml-2">(Customer already exists)</span>
                  )}
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="generate-invoice"
                  checked={generateInvoice}
                  onCheckedChange={(checked) => setGenerateInvoice(!!checked)}
                  disabled={selectedItems.length === 0}
                  data-testid="checkbox-generate-invoice"
                />
                <Label htmlFor="generate-invoice" className="text-sm">
                  Generate invoice for services provided
                  {selectedItems.length === 0 && (
                    <span className="text-muted-foreground ml-2">(No items selected)</span>
                  )}
                </Label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={onCancel} data-testid="button-cancel-completion">
                Complete Without Logging
              </Button>
              <div className="flex space-x-2">
                {(createCustomer && !existingCustomer) || generateInvoice ? (
                  <Button onClick={() => setStep(2)} data-testid="button-next-step">
                    Next: Customer Info
                  </Button>
                ) : (
                  <Button 
                    onClick={handleComplete}
                    disabled={completeCallMutation.isPending}
                    data-testid="button-complete-call"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Complete Call
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="w-5 h-5 mr-2" />
              Customer Information
            </CardTitle>
            <p className="text-muted-foreground">
              {existingCustomer ? "Using existing customer" : "Enter customer details for invoice"}
            </p>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {existingCustomer ? (
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium">{existingCustomer.firstName} {existingCustomer.lastName}</h4>
                <p className="text-sm text-muted-foreground">{existingCustomer.phoneNumber}</p>
                {existingCustomer.email && (
                  <p className="text-sm text-muted-foreground">{existingCustomer.email}</p>
                )}
                {existingCustomer.address && (
                  <p className="text-sm text-muted-foreground">
                    {existingCustomer.address}, {existingCustomer.city}, {existingCustomer.state}
                  </p>
                )}
              </div>
            ) : createCustomer ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={customerInfo.firstName}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, firstName: e.target.value }))}
                    data-testid="input-customer-firstname"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={customerInfo.lastName}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, lastName: e.target.value }))}
                    data-testid="input-customer-lastname"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                    data-testid="input-customer-email"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={customerInfo.phoneNumber}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, phoneNumber: e.target.value }))}
                    data-testid="input-customer-phone"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={customerInfo.address}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, address: e.target.value }))}
                    data-testid="input-customer-address"
                  />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={customerInfo.city}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, city: e.target.value }))}
                    data-testid="input-customer-city"
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={customerInfo.state}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, state: e.target.value }))}
                    data-testid="input-customer-state"
                  />
                </div>
              </div>
            ) : (
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Customer information not needed</p>
              </div>
            )}

            {/* Summary */}
            {generateInvoice && selectedItems.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Invoice Summary</h3>
                <div className="space-y-2">
                  {selectedItems.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{item.name} (x{item.quantity})</span>
                      <span>${(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total:</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep(1)} data-testid="button-back">
                Back
              </Button>
              <Button 
                onClick={handleComplete}
                disabled={completeCallMutation.isPending || (createCustomer && !existingCustomer && (!customerInfo.firstName || !customerInfo.lastName))}
                data-testid="button-complete-call"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Complete Call
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}