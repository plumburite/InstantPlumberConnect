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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { 
  Plus, Edit, Trash2, Download, Send, DollarSign, 
  Calendar, User, Phone, Mail, MapPin, FileText
} from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import type { Invoice, Customer, InvoiceItem, Service, Inventory } from "@shared/schema";

interface InvoiceDetailProps {
  invoiceId: string;
  onClose: () => void;
}

export default function InvoiceDetail({ invoiceId, onClose }: InvoiceDetailProps) {
  const { toast } = useToast();
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [itemForm, setItemForm] = useState({
    serviceId: "", inventoryId: "", description: "", quantity: "1", unitPrice: "", totalPrice: ""
  });
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Data queries
  const { data: invoice, isLoading } = useQuery<Invoice & { items: InvoiceItem[] }>({
    queryKey: ["/api/invoices", invoiceId],
  });
  
  const { data: customer } = useQuery<Customer>({
    queryKey: ["/api/customers", invoice?.customerId],
    enabled: !!invoice?.customerId,
  });
  
  const { data: services = [] } = useQuery<Service[]>({ queryKey: ["/api/services"] });
  const { data: inventory = [] } = useQuery<Inventory[]>({ queryKey: ["/api/inventory"] });

  // Invoice item mutations
  const createItemMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/invoices/${invoiceId}/items`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", invoiceId] });
      setShowItemDialog(false);
      resetItemForm();
      toast({ title: "Invoice item added successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add invoice item", description: error.message, variant: "destructive" });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/invoice-items/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", invoiceId] });
      setShowItemDialog(false);
      resetItemForm();
      toast({ title: "Invoice item updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update invoice item", description: error.message, variant: "destructive" });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/invoice-items/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", invoiceId] });
      toast({ title: "Invoice item deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete invoice item", description: error.message, variant: "destructive" });
    },
  });

  const updateInvoiceStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await apiRequest("PATCH", `/api/invoices/${invoiceId}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Invoice status updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update invoice status", description: error.message, variant: "destructive" });
    },
  });

  const resetItemForm = () => {
    setItemForm({
      serviceId: "", inventoryId: "", description: "", quantity: "1", unitPrice: "", totalPrice: ""
    });
    setEditingItemId(null);
  };

  const handleSubmitItem = () => {
    const data = {
      serviceId: itemForm.serviceId || null,
      inventoryId: itemForm.inventoryId || null,
      description: itemForm.description,
      quantity: parseInt(itemForm.quantity) || 1,
      unitPrice: itemForm.unitPrice,
      totalPrice: itemForm.totalPrice,
    };

    if (editingItemId) {
      updateItemMutation.mutate({ id: editingItemId, data });
    } else {
      createItemMutation.mutate(data);
    }
  };

  const handleEditItem = (item: InvoiceItem) => {
    setItemForm({
      serviceId: item.serviceId || "",
      inventoryId: item.inventoryId || "",
      description: item.description,
      quantity: item.quantity?.toString() || "1",
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    });
    setEditingItemId(item.id);
    setShowItemDialog(true);
  };

  const generatePDF = async () => {
    if (!invoice || !customer) return;

    try {
      const pdf = new jsPDF();
      
      // Header
      pdf.setFontSize(20);
      pdf.text("INVOICE", 20, 30);
      
      pdf.setFontSize(12);
      pdf.text(`Invoice #: ${invoice.invoiceNumber}`, 20, 45);
      pdf.text(`Date: ${format(new Date(invoice.createdAt), 'MMMM d, yyyy')}`, 20, 55);
      
      if (invoice.dueDate) {
        pdf.text(`Due Date: ${format(new Date(invoice.dueDate), 'MMMM d, yyyy')}`, 20, 65);
      }

      // Customer Information
      pdf.setFontSize(14);
      pdf.text("Bill To:", 20, 85);
      pdf.setFontSize(10);
      pdf.text(`${customer.firstName} ${customer.lastName}`, 20, 95);
      if (customer.email) pdf.text(customer.email, 20, 105);
      pdf.text(customer.phoneNumber, 20, 115);
      if (customer.address) {
        pdf.text(customer.address, 20, 125);
        pdf.text(`${customer.city || ''}, ${customer.state || ''} ${customer.zipCode || ''}`, 20, 135);
      }

      // Line Items Table
      let yPos = 160;
      pdf.setFontSize(12);
      pdf.text("Description", 20, yPos);
      pdf.text("Qty", 120, yPos);
      pdf.text("Unit Price", 140, yPos);
      pdf.text("Total", 170, yPos);
      
      yPos += 10;
      pdf.line(20, yPos, 190, yPos); // Table header line
      yPos += 10;

      // Add items
      invoice.items?.forEach((item) => {
        pdf.setFontSize(10);
        pdf.text(item.description, 20, yPos);
        pdf.text((item.quantity || 1).toString(), 120, yPos);
        pdf.text(`$${item.unitPrice}`, 140, yPos);
        pdf.text(`$${item.totalPrice}`, 170, yPos);
        yPos += 15;
      });

      // Totals
      yPos += 10;
      pdf.line(120, yPos, 190, yPos); // Separator line
      yPos += 15;
      
      pdf.setFontSize(12);
      pdf.text(`Subtotal: $${invoice.subtotal}`, 140, yPos);
      yPos += 15;
      if (parseFloat(invoice.taxAmount || "0") > 0) {
        pdf.text(`Tax: $${invoice.taxAmount}`, 140, yPos);
        yPos += 15;
      }
      pdf.setFontSize(14);
      pdf.text(`Total: $${invoice.totalAmount}`, 140, yPos);

      // Footer
      if (invoice.notes) {
        yPos += 30;
        pdf.setFontSize(10);
        pdf.text("Notes:", 20, yPos);
        yPos += 10;
        pdf.text(invoice.notes, 20, yPos);
      }

      // Save PDF
      pdf.save(`invoice-${invoice.invoiceNumber}.pdf`);
      toast({ title: "PDF generated successfully" });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({ title: "Failed to generate PDF", variant: "destructive" });
    }
  };

  const calculateItemTotal = () => {
    const quantity = parseInt(itemForm.quantity) || 1;
    const unitPrice = parseFloat(itemForm.unitPrice) || 0;
    return (quantity * unitPrice).toFixed(2);
  };

  // Update total price when quantity or unit price changes
  const handleQuantityChange = (value: string) => {
    setItemForm(prev => ({
      ...prev,
      quantity: value,
      totalPrice: calculateItemTotal()
    }));
  };

  const handleUnitPriceChange = (value: string) => {
    setItemForm(prev => {
      const quantity = parseInt(prev.quantity) || 1;
      const unitPrice = parseFloat(value) || 0;
      return {
        ...prev,
        unitPrice: value,
        totalPrice: (quantity * unitPrice).toFixed(2)
      };
    });
  };

  const handleServiceSelect = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (service) {
      setItemForm(prev => ({
        ...prev,
        serviceId,
        inventoryId: "",
        description: service.name,
        unitPrice: service.basePrice,
        totalPrice: calculateItemTotal()
      }));
    }
  };

  const handleInventorySelect = (inventoryId: string) => {
    const item = inventory.find(i => i.id === inventoryId);
    if (item) {
      setItemForm(prev => ({
        ...prev,
        inventoryId,
        serviceId: "",
        description: item.name,
        unitPrice: item.unitPrice,
        totalPrice: calculateItemTotal()
      }));
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground mb-4">Invoice not found</p>
            <Button onClick={onClose}>Close</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 overflow-auto">
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl">Invoice {invoice.invoiceNumber}</CardTitle>
                  <div className="flex items-center space-x-4 mt-2">
                    <Badge variant={
                      invoice.status === 'paid' ? 'default' : 
                      invoice.status === 'sent' ? 'secondary' : 'outline'
                    }>
                      {invoice.status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Created {format(new Date(invoice.createdAt), 'MMMM d, yyyy')}
                    </span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button onClick={generatePDF} variant="outline" data-testid="button-download-pdf">
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                  <Button onClick={() => updateInvoiceStatusMutation.mutate('sent')} variant="outline" data-testid="button-send-invoice">
                    <Send className="w-4 h-4 mr-2" />
                    Mark as Sent
                  </Button>
                  <Button onClick={onClose} variant="outline">Close</Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Customer Information */}
              {customer && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      Customer Information
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <User className="w-3 h-3 text-muted-foreground" />
                        <span>{customer.firstName} {customer.lastName}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Phone className="w-3 h-3 text-muted-foreground" />
                        <span>{customer.phoneNumber}</span>
                      </div>
                      {customer.email && (
                        <div className="flex items-center space-x-2">
                          <Mail className="w-3 h-3 text-muted-foreground" />
                          <span>{customer.email}</span>
                        </div>
                      )}
                      {customer.address && (
                        <div className="flex items-start space-x-2">
                          <MapPin className="w-3 h-3 text-muted-foreground mt-0.5" />
                          <div>
                            <div>{customer.address}</div>
                            <div className="text-sm text-muted-foreground">
                              {customer.city}, {customer.state} {customer.zipCode}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      Invoice Details
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Status:</span>
                        <Badge variant={
                          invoice.status === 'paid' ? 'default' : 
                          invoice.status === 'sent' ? 'secondary' : 'outline'
                        }>
                          {invoice.status}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Created:</span>
                        <span className="text-sm">{format(new Date(invoice.createdAt), 'MMM d, yyyy')}</span>
                      </div>
                      {invoice.dueDate && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Due Date:</span>
                          <span className="text-sm">{format(new Date(invoice.dueDate), 'MMM d, yyyy')}</span>
                        </div>
                      )}
                      {invoice.paidAt && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Paid:</span>
                          <span className="text-sm">{format(new Date(invoice.paidAt), 'MMM d, yyyy')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              {/* Line Items */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold flex items-center">
                    <FileText className="w-4 h-4 mr-2" />
                    Line Items
                  </h3>
                  <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" onClick={() => { resetItemForm(); setShowItemDialog(true); }} data-testid="button-add-line-item">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Item
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editingItemId ? "Edit Line Item" : "Add Line Item"}</DialogTitle>
                        <DialogDescription>
                          Add a service or inventory item to this invoice
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="itemService">Service</Label>
                            <Select value={itemForm.serviceId} onValueChange={handleServiceSelect}>
                              <SelectTrigger data-testid="select-item-service">
                                <SelectValue placeholder="Select service" />
                              </SelectTrigger>
                              <SelectContent>
                                {services.map((service) => (
                                  <SelectItem key={service.id} value={service.id}>
                                    {service.name} - ${service.basePrice}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="itemInventory">Inventory Item</Label>
                            <Select value={itemForm.inventoryId} onValueChange={handleInventorySelect}>
                              <SelectTrigger data-testid="select-item-inventory">
                                <SelectValue placeholder="Select item" />
                              </SelectTrigger>
                              <SelectContent>
                                {inventory.map((item) => (
                                  <SelectItem key={item.id} value={item.id}>
                                    {item.name} - ${item.unitPrice}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="itemDescription">Description *</Label>
                          <Textarea
                            id="itemDescription"
                            value={itemForm.description}
                            onChange={(e) => setItemForm(prev => ({ ...prev, description: e.target.value }))}
                            rows={2}
                            data-testid="input-item-description"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="itemQuantity">Quantity *</Label>
                            <Input
                              id="itemQuantity"
                              type="number"
                              value={itemForm.quantity}
                              onChange={(e) => handleQuantityChange(e.target.value)}
                              data-testid="input-item-quantity"
                            />
                          </div>
                          <div>
                            <Label htmlFor="itemUnitPrice">Unit Price *</Label>
                            <Input
                              id="itemUnitPrice"
                              type="number"
                              step="0.01"
                              value={itemForm.unitPrice}
                              onChange={(e) => handleUnitPriceChange(e.target.value)}
                              data-testid="input-item-unit-price"
                            />
                          </div>
                          <div>
                            <Label htmlFor="itemTotalPrice">Total Price</Label>
                            <Input
                              id="itemTotalPrice"
                              type="number"
                              step="0.01"
                              value={itemForm.totalPrice}
                              onChange={(e) => setItemForm(prev => ({ ...prev, totalPrice: e.target.value }))}
                              data-testid="input-item-total-price"
                            />
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowItemDialog(false)}>Cancel</Button>
                        <Button 
                          onClick={handleSubmitItem}
                          disabled={createItemMutation.isPending || updateItemMutation.isPending}
                          data-testid="button-save-line-item"
                        >
                          {editingItemId ? "Update Item" : "Add Item"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.items?.map((item) => (
                      <TableRow key={item.id} data-testid={`row-invoice-item-${item.id}`}>
                        <TableCell>
                          <div>{item.description}</div>
                          {item.serviceId && (
                            <Badge variant="outline" className="mt-1">Service</Badge>
                          )}
                          {item.inventoryId && (
                            <Badge variant="outline" className="mt-1">Material</Badge>
                          )}
                        </TableCell>
                        <TableCell>{item.quantity || 1}</TableCell>
                        <TableCell>${item.unitPrice}</TableCell>
                        <TableCell className="font-medium">${item.totalPrice}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleEditItem(item)}
                              data-testid={`button-edit-item-${item.id}`}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => deleteItemMutation.mutate(item.id)}
                              disabled={deleteItemMutation.isPending}
                              data-testid={`button-delete-item-${item.id}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Separator />

              {/* Invoice Summary */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span>${invoice.subtotal}</span>
                  </div>
                  {parseFloat(invoice.taxAmount || "0") > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax:</span>
                      <span>${invoice.taxAmount}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total:</span>
                    <span>${invoice.totalAmount}</span>
                  </div>
                </div>
              </div>

              {/* Invoice Notes */}
              {invoice.notes && (
                <div>
                  <h3 className="font-semibold mb-2">Notes</h3>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">{invoice.notes}</p>
                </div>
              )}

              {/* Status Actions */}
              <div className="flex justify-between items-center pt-4 border-t">
                <div className="flex space-x-2">
                  {invoice.status === 'draft' && (
                    <Button 
                      onClick={() => updateInvoiceStatusMutation.mutate('sent')}
                      disabled={updateInvoiceStatusMutation.isPending}
                      data-testid="button-mark-sent"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Mark as Sent
                    </Button>
                  )}
                  {invoice.status === 'sent' && (
                    <Button 
                      onClick={() => updateInvoiceStatusMutation.mutate('paid')}
                      disabled={updateInvoiceStatusMutation.isPending}
                      data-testid="button-mark-paid"
                    >
                      <DollarSign className="w-4 h-4 mr-2" />
                      Mark as Paid
                    </Button>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  Last updated {format(new Date(invoice.updatedAt), 'MMM d, yyyy h:mm a')}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}