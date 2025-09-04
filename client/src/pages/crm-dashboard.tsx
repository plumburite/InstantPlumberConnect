import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import NavigationHeader from "@/components/navigation-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Users, Package, FileText, Settings, Plus, Edit, Trash2, DollarSign, 
  AlertTriangle, Calendar, Search, Phone, Mail, MapPin, Receipt, FolderOpen, Upload, Download, MessageSquare
} from "lucide-react";
import { format } from "date-fns";
import InvoiceDetail from "@/components/invoice-detail";
import SMSManager from "@/components/sms-manager";
import type { Customer, Service, Inventory, Invoice, File } from "@shared/schema";

export default function CrmDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("customers");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  // Customer form state
  const [customerForm, setCustomerForm] = useState({
    firstName: "", lastName: "", email: "", phoneNumber: "",
    address: "", city: "", state: "", zipCode: "", notes: ""
  });
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);

  // Service form state
  const [serviceForm, setServiceForm] = useState({
    name: "", description: "", basePrice: "", category: "", estimatedDuration: ""
  });
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [showServiceDialog, setShowServiceDialog] = useState(false);

  // Inventory form state
  const [inventoryForm, setInventoryForm] = useState({
    name: "", description: "", sku: "", category: "", unitPrice: "",
    quantityInStock: "", minimumStock: "", supplier: ""
  });
  const [editingInventoryId, setEditingInventoryId] = useState<string | null>(null);
  const [showInventoryDialog, setShowInventoryDialog] = useState(false);

  // Invoice form state
  const [invoiceForm, setInvoiceForm] = useState({
    customerId: "", subtotal: "", taxAmount: "", totalAmount: "", notes: ""
  });
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);

  // File management state
  const [fileForm, setFileForm] = useState({
    fileName: "", filePath: "", fileType: "", fileSize: "",
    customerId: "", callId: "", invoiceId: "", description: ""
  });
  const [showFileDialog, setShowFileDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Data queries
  const { data: customers = [] } = useQuery<Customer[]>({ queryKey: ["/api/customers"] });
  const { data: services = [] } = useQuery<Service[]>({ queryKey: ["/api/services"] });
  const { data: inventory = [] } = useQuery<Inventory[]>({ queryKey: ["/api/inventory"] });
  const { data: invoices = [] } = useQuery<Invoice[]>({ queryKey: ["/api/invoices"] });
  const { data: files = [] } = useQuery<File[]>({ queryKey: ["/api/files"] });
  const { data: lowStockItems = [] } = useQuery<Inventory[]>({ queryKey: ["/api/inventory/low-stock"] });

  // Customer mutations
  const createCustomerMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/customers", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setShowCustomerDialog(false);
      resetCustomerForm();
      toast({ title: "Customer created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create customer", description: error.message, variant: "destructive" });
    },
  });

  const updateCustomerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/customers/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setShowCustomerDialog(false);
      resetCustomerForm();
      toast({ title: "Customer updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update customer", description: error.message, variant: "destructive" });
    },
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/customers/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ title: "Customer deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete customer", description: error.message, variant: "destructive" });
    },
  });

  // Service mutations
  const createServiceMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/services", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setShowServiceDialog(false);
      resetServiceForm();
      toast({ title: "Service created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create service", description: error.message, variant: "destructive" });
    },
  });

  const updateServiceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/services/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setShowServiceDialog(false);
      resetServiceForm();
      toast({ title: "Service updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update service", description: error.message, variant: "destructive" });
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/services/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({ title: "Service deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete service", description: error.message, variant: "destructive" });
    },
  });

  // Inventory mutations
  const createInventoryMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/inventory", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/low-stock"] });
      setShowInventoryDialog(false);
      resetInventoryForm();
      toast({ title: "Inventory item created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create inventory item", description: error.message, variant: "destructive" });
    },
  });

  const updateInventoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/inventory/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/low-stock"] });
      setShowInventoryDialog(false);
      resetInventoryForm();
      toast({ title: "Inventory item updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update inventory item", description: error.message, variant: "destructive" });
    },
  });

  const deleteInventoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/inventory/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/low-stock"] });
      toast({ title: "Inventory item deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete inventory item", description: error.message, variant: "destructive" });
    },
  });

  // Invoice mutations
  const createInvoiceMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/invoices", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setShowInvoiceDialog(false);
      resetInvoiceForm();
      toast({ title: "Invoice created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create invoice", description: error.message, variant: "destructive" });
    },
  });

  // File management mutations
  const createFileMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/files", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      setShowFileDialog(false);
      resetFileForm();
      toast({ title: "File uploaded successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to upload file", description: error.message, variant: "destructive" });
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/files/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      toast({ title: "File deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete file", description: error.message, variant: "destructive" });
    },
  });

  // Helper functions
  const resetCustomerForm = () => {
    setCustomerForm({
      firstName: "", lastName: "", email: "", phoneNumber: "",
      address: "", city: "", state: "", zipCode: "", notes: ""
    });
    setEditingCustomerId(null);
  };

  const resetServiceForm = () => {
    setServiceForm({
      name: "", description: "", basePrice: "", category: "", estimatedDuration: ""
    });
    setEditingServiceId(null);
  };

  const resetInventoryForm = () => {
    setInventoryForm({
      name: "", description: "", sku: "", category: "", unitPrice: "",
      quantityInStock: "", minimumStock: "", supplier: ""
    });
    setEditingInventoryId(null);
  };

  const resetInvoiceForm = () => {
    setInvoiceForm({
      customerId: "", subtotal: "", taxAmount: "", totalAmount: "", notes: ""
    });
  };

  const resetFileForm = () => {
    setFileForm({
      fileName: "", filePath: "", fileType: "", fileSize: "",
      customerId: "", callId: "", invoiceId: "", description: ""
    });
    setSelectedFile(null);
  };

  const handleEditCustomer = (customer: Customer) => {
    setCustomerForm({
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email || "",
      phoneNumber: customer.phoneNumber,
      address: customer.address || "",
      city: customer.city || "",
      state: customer.state || "",
      zipCode: customer.zipCode || "",
      notes: customer.notes || ""
    });
    setEditingCustomerId(customer.id);
    setShowCustomerDialog(true);
  };

  const handleEditService = (service: Service) => {
    setServiceForm({
      name: service.name,
      description: service.description || "",
      basePrice: service.basePrice,
      category: service.category,
      estimatedDuration: service.estimatedDuration || ""
    });
    setEditingServiceId(service.id);
    setShowServiceDialog(true);
  };

  const handleEditInventory = (item: Inventory) => {
    setInventoryForm({
      name: item.name,
      description: item.description || "",
      sku: item.sku || "",
      category: item.category,
      unitPrice: item.unitPrice,
      quantityInStock: item.quantityInStock.toString(),
      minimumStock: item.minimumStock.toString(),
      supplier: item.supplier || ""
    });
    setEditingInventoryId(item.id);
    setShowInventoryDialog(true);
  };

  const handleSubmitCustomer = () => {
    const data = {
      ...customerForm,
      email: customerForm.email || null,
      address: customerForm.address || null,
      city: customerForm.city || null,
      state: customerForm.state || null,
      zipCode: customerForm.zipCode || null,
      notes: customerForm.notes || null,
    };

    if (editingCustomerId) {
      updateCustomerMutation.mutate({ id: editingCustomerId, data });
    } else {
      createCustomerMutation.mutate(data);
    }
  };

  const handleSubmitService = () => {
    const data = {
      ...serviceForm,
      basePrice: serviceForm.basePrice,
      description: serviceForm.description || null,
      estimatedDuration: serviceForm.estimatedDuration || null,
    };

    if (editingServiceId) {
      updateServiceMutation.mutate({ id: editingServiceId, data });
    } else {
      createServiceMutation.mutate(data);
    }
  };

  const handleSubmitInventory = () => {
    const data = {
      ...inventoryForm,
      unitPrice: inventoryForm.unitPrice,
      quantityInStock: parseInt(inventoryForm.quantityInStock) || 0,
      minimumStock: parseInt(inventoryForm.minimumStock) || 0,
      description: inventoryForm.description || null,
      sku: inventoryForm.sku || null,
      supplier: inventoryForm.supplier || null,
    };

    if (editingInventoryId) {
      updateInventoryMutation.mutate({ id: editingInventoryId, data });
    } else {
      createInventoryMutation.mutate(data);
    }
  };

  const handleSubmitInvoice = () => {
    const data = {
      customerId: invoiceForm.customerId || null,
      plumberId: user?.id || null,
      subtotal: invoiceForm.subtotal,
      taxAmount: invoiceForm.taxAmount || "0",
      totalAmount: invoiceForm.totalAmount,
      notes: invoiceForm.notes || null,
    };
    createInvoiceMutation.mutate(data);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // In a real implementation, you would upload the file to a storage service
    // For now, we'll just store the file metadata
    const fileData = {
      fileName: file.name,
      filePath: `/uploads/${Date.now()}-${file.name}`,
      fileType: file.type,
      fileSize: file.size.toString(),
      customerId: fileForm.customerId || null,
      callId: fileForm.callId || null,
      invoiceId: fileForm.invoiceId || null,
      description: fileForm.description || file.name,
    };

    createFileMutation.mutate(fileData);
    event.target.value = ""; // Reset file input
  };

  // Filter functions
  const filteredCustomers = customers.filter((customer: Customer) => 
    customer.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phoneNumber.includes(searchTerm) ||
    (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredServices = services.filter((service: Service) => 
    service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredInventory = inventory.filter((item: Inventory) => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredFiles = files.filter((file: File) => 
    file.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (file.description && file.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredInvoices = invoices.filter((invoice: Invoice) => 
    invoice.invoiceNumber.includes(searchTerm.toUpperCase())
  );

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />
      
      <main className="max-w-7xl mx-auto p-4 space-y-6">
        {/* CRM Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-crm-title">Business Management</h1>
            <p className="text-muted-foreground">Manage your customers, services, inventory, and invoices</p>
          </div>
          
          {/* Low Stock Alert */}
          {lowStockItems.length > 0 && (
            <Card className="border-destructive">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  <span className="text-sm font-medium text-destructive" data-testid="text-low-stock-alert">
                    {lowStockItems.length} items low in stock
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search customers, services, inventory, or invoices..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="input-search"
          />
        </div>

        {/* CRM Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="customers" className="flex items-center space-x-2" data-testid="tab-customers">
              <Users className="w-4 h-4" />
              <span>Customers</span>
            </TabsTrigger>
            <TabsTrigger value="services" className="flex items-center space-x-2" data-testid="tab-services">
              <Settings className="w-4 h-4" />
              <span>Services</span>
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center space-x-2" data-testid="tab-inventory">
              <Package className="w-4 h-4" />
              <span>Inventory</span>
            </TabsTrigger>
            <TabsTrigger value="invoices" className="flex items-center space-x-2" data-testid="tab-invoices">
              <FileText className="w-4 h-4" />
              <span>Invoices</span>
            </TabsTrigger>
            <TabsTrigger value="files" className="flex items-center space-x-2" data-testid="tab-files">
              <FolderOpen className="w-4 h-4" />
              <span>Files</span>
            </TabsTrigger>
            <TabsTrigger value="sms" className="flex items-center space-x-2" data-testid="tab-sms">
              <MessageSquare className="w-4 h-4" />
              <span>SMS</span>
            </TabsTrigger>
          </TabsList>

          {/* Customers Tab */}
          <TabsContent value="customers" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Customer Management</h2>
              <Dialog open={showCustomerDialog} onOpenChange={setShowCustomerDialog}>
                <DialogTrigger asChild>
                  <Button onClick={() => { resetCustomerForm(); setShowCustomerDialog(true); }} data-testid="button-add-customer">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Customer
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingCustomerId ? "Edit Customer" : "Add New Customer"}</DialogTitle>
                    <DialogDescription>
                      {editingCustomerId ? "Update customer information" : "Add a new customer to your database"}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        value={customerForm.firstName}
                        onChange={(e) => setCustomerForm(prev => ({ ...prev, firstName: e.target.value }))}
                        data-testid="input-customer-firstname"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={customerForm.lastName}
                        onChange={(e) => setCustomerForm(prev => ({ ...prev, lastName: e.target.value }))}
                        data-testid="input-customer-lastname"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={customerForm.email}
                        onChange={(e) => setCustomerForm(prev => ({ ...prev, email: e.target.value }))}
                        data-testid="input-customer-email"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phoneNumber">Phone Number *</Label>
                      <Input
                        id="phoneNumber"
                        value={customerForm.phoneNumber}
                        onChange={(e) => setCustomerForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
                        data-testid="input-customer-phone"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={customerForm.address}
                        onChange={(e) => setCustomerForm(prev => ({ ...prev, address: e.target.value }))}
                        data-testid="input-customer-address"
                      />
                    </div>
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={customerForm.city}
                        onChange={(e) => setCustomerForm(prev => ({ ...prev, city: e.target.value }))}
                        data-testid="input-customer-city"
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={customerForm.state}
                        onChange={(e) => setCustomerForm(prev => ({ ...prev, state: e.target.value }))}
                        data-testid="input-customer-state"
                      />
                    </div>
                    <div>
                      <Label htmlFor="zipCode">ZIP Code</Label>
                      <Input
                        id="zipCode"
                        value={customerForm.zipCode}
                        onChange={(e) => setCustomerForm(prev => ({ ...prev, zipCode: e.target.value }))}
                        data-testid="input-customer-zip"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={customerForm.notes}
                        onChange={(e) => setCustomerForm(prev => ({ ...prev, notes: e.target.value }))}
                        rows={3}
                        data-testid="input-customer-notes"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowCustomerDialog(false)}>Cancel</Button>
                    <Button 
                      onClick={handleSubmitCustomer}
                      disabled={createCustomerMutation.isPending || updateCustomerMutation.isPending}
                      data-testid="button-save-customer"
                    >
                      {editingCustomerId ? "Update Customer" : "Add Customer"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Membership</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer: Customer) => (
                      <TableRow key={customer.id} data-testid={`row-customer-${customer.id}`}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{customer.firstName} {customer.lastName}</div>
                            <div className="text-sm text-muted-foreground">
                              Added {format(new Date(customer.createdAt), 'MMM d, yyyy')}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <Phone className="w-3 h-3" />
                              <span className="text-sm">{customer.phoneNumber}</span>
                            </div>
                            {customer.email && (
                              <div className="flex items-center space-x-2">
                                <Mail className="w-3 h-3" />
                                <span className="text-sm">{customer.email}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {customer.city && customer.state ? (
                            <div className="flex items-center space-x-2">
                              <MapPin className="w-3 h-3" />
                              <span className="text-sm">{customer.city}, {customer.state}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">No address</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={customer.membershipStatus === 'premium' ? 'default' : 'secondary'}>
                            {customer.membershipStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleEditCustomer(customer)}
                              data-testid={`button-edit-customer-${customer.id}`}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => deleteCustomerMutation.mutate(customer.id)}
                              disabled={deleteCustomerMutation.isPending}
                              data-testid={`button-delete-customer-${customer.id}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Services Tab */}
          <TabsContent value="services" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Service Management</h2>
              <Dialog open={showServiceDialog} onOpenChange={setShowServiceDialog}>
                <DialogTrigger asChild>
                  <Button onClick={() => { resetServiceForm(); setShowServiceDialog(true); }} data-testid="button-add-service">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Service
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingServiceId ? "Edit Service" : "Add New Service"}</DialogTitle>
                    <DialogDescription>
                      {editingServiceId ? "Update service information" : "Add a new service to your offerings"}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="serviceName">Service Name *</Label>
                      <Input
                        id="serviceName"
                        value={serviceForm.name}
                        onChange={(e) => setServiceForm(prev => ({ ...prev, name: e.target.value }))}
                        data-testid="input-service-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="serviceDescription">Description</Label>
                      <Textarea
                        id="serviceDescription"
                        value={serviceForm.description}
                        onChange={(e) => setServiceForm(prev => ({ ...prev, description: e.target.value }))}
                        rows={3}
                        data-testid="input-service-description"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="basePrice">Base Price *</Label>
                        <Input
                          id="basePrice"
                          type="number"
                          step="0.01"
                          value={serviceForm.basePrice}
                          onChange={(e) => setServiceForm(prev => ({ ...prev, basePrice: e.target.value }))}
                          data-testid="input-service-price"
                        />
                      </div>
                      <div>
                        <Label htmlFor="category">Category *</Label>
                        <Select value={serviceForm.category} onValueChange={(value) => setServiceForm(prev => ({ ...prev, category: value }))}>
                          <SelectTrigger data-testid="select-service-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="repair">Repair</SelectItem>
                            <SelectItem value="installation">Installation</SelectItem>
                            <SelectItem value="maintenance">Maintenance</SelectItem>
                            <SelectItem value="emergency">Emergency</SelectItem>
                            <SelectItem value="consultation">Consultation</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="estimatedDuration">Estimated Duration (minutes)</Label>
                      <Input
                        id="estimatedDuration"
                        type="number"
                        value={serviceForm.estimatedDuration}
                        onChange={(e) => setServiceForm(prev => ({ ...prev, estimatedDuration: e.target.value }))}
                        data-testid="input-service-duration"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowServiceDialog(false)}>Cancel</Button>
                    <Button 
                      onClick={handleSubmitService}
                      disabled={createServiceMutation.isPending || updateServiceMutation.isPending}
                      data-testid="button-save-service"
                    >
                      {editingServiceId ? "Update Service" : "Add Service"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredServices.map((service: Service) => (
                <Card key={service.id} data-testid={`card-service-${service.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{service.name}</CardTitle>
                      <Badge variant={service.isActive ? "default" : "secondary"}>
                        {service.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">{service.description}</p>
                      <div className="flex justify-between text-sm">
                        <span>Price:</span>
                        <span className="font-medium">${service.basePrice}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Category:</span>
                        <Badge variant="outline">{service.category}</Badge>
                      </div>
                      {service.estimatedDuration && (
                        <div className="flex justify-between text-sm">
                          <span>Duration:</span>
                          <span>{service.estimatedDuration} min</span>
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2 mt-4">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleEditService(service)}
                        data-testid={`button-edit-service-${service.id}`}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => deleteServiceMutation.mutate(service.id)}
                        disabled={deleteServiceMutation.isPending}
                        data-testid={`button-delete-service-${service.id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Inventory Management</h2>
              <Dialog open={showInventoryDialog} onOpenChange={setShowInventoryDialog}>
                <DialogTrigger asChild>
                  <Button onClick={() => { resetInventoryForm(); setShowInventoryDialog(true); }} data-testid="button-add-inventory">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingInventoryId ? "Edit Inventory Item" : "Add New Inventory Item"}</DialogTitle>
                    <DialogDescription>
                      {editingInventoryId ? "Update inventory item information" : "Add a new item to your inventory"}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="itemName">Item Name *</Label>
                        <Input
                          id="itemName"
                          value={inventoryForm.name}
                          onChange={(e) => setInventoryForm(prev => ({ ...prev, name: e.target.value }))}
                          data-testid="input-inventory-name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="sku">SKU</Label>
                        <Input
                          id="sku"
                          value={inventoryForm.sku}
                          onChange={(e) => setInventoryForm(prev => ({ ...prev, sku: e.target.value }))}
                          data-testid="input-inventory-sku"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="itemDescription">Description</Label>
                      <Textarea
                        id="itemDescription"
                        value={inventoryForm.description}
                        onChange={(e) => setInventoryForm(prev => ({ ...prev, description: e.target.value }))}
                        rows={2}
                        data-testid="input-inventory-description"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="itemCategory">Category *</Label>
                        <Select value={inventoryForm.category} onValueChange={(value) => setInventoryForm(prev => ({ ...prev, category: value }))}>
                          <SelectTrigger data-testid="select-inventory-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pipes">Pipes & Fittings</SelectItem>
                            <SelectItem value="tools">Tools</SelectItem>
                            <SelectItem value="fixtures">Fixtures</SelectItem>
                            <SelectItem value="parts">Parts & Components</SelectItem>
                            <SelectItem value="chemicals">Chemicals & Cleaners</SelectItem>
                            <SelectItem value="safety">Safety Equipment</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="unitPrice">Unit Price *</Label>
                        <Input
                          id="unitPrice"
                          type="number"
                          step="0.01"
                          value={inventoryForm.unitPrice}
                          onChange={(e) => setInventoryForm(prev => ({ ...prev, unitPrice: e.target.value }))}
                          data-testid="input-inventory-price"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="quantityInStock">Quantity in Stock *</Label>
                        <Input
                          id="quantityInStock"
                          type="number"
                          value={inventoryForm.quantityInStock}
                          onChange={(e) => setInventoryForm(prev => ({ ...prev, quantityInStock: e.target.value }))}
                          data-testid="input-inventory-quantity"
                        />
                      </div>
                      <div>
                        <Label htmlFor="minimumStock">Minimum Stock *</Label>
                        <Input
                          id="minimumStock"
                          type="number"
                          value={inventoryForm.minimumStock}
                          onChange={(e) => setInventoryForm(prev => ({ ...prev, minimumStock: e.target.value }))}
                          data-testid="input-inventory-minimum"
                        />
                      </div>
                      <div>
                        <Label htmlFor="supplier">Supplier</Label>
                        <Input
                          id="supplier"
                          value={inventoryForm.supplier}
                          onChange={(e) => setInventoryForm(prev => ({ ...prev, supplier: e.target.value }))}
                          data-testid="input-inventory-supplier"
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowInventoryDialog(false)}>Cancel</Button>
                    <Button 
                      onClick={handleSubmitInventory}
                      disabled={createInventoryMutation.isPending || updateInventoryMutation.isPending}
                      data-testid="button-save-inventory"
                    >
                      {editingInventoryId ? "Update Item" : "Add Item"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInventory.map((item: Inventory) => (
                      <TableRow key={item.id} data-testid={`row-inventory-${item.id}`}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.name}</div>
                            <div className="text-sm text-muted-foreground">{item.sku || "No SKU"}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.category}</Badge>
                        </TableCell>
                        <TableCell>${item.unitPrice}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>In Stock: {item.quantityInStock || 0}</div>
                            <div className="text-muted-foreground">Min: {item.minimumStock || 0}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {(item.quantityInStock || 0) <= (item.minimumStock || 0) ? (
                            <Badge variant="destructive">Low Stock</Badge>
                          ) : (
                            <Badge variant="default">In Stock</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleEditInventory(item)}
                              data-testid={`button-edit-inventory-${item.id}`}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => deleteInventoryMutation.mutate(item.id)}
                              disabled={deleteInventoryMutation.isPending}
                              data-testid={`button-delete-inventory-${item.id}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Invoice Management</h2>
              <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
                <DialogTrigger asChild>
                  <Button onClick={() => { resetInvoiceForm(); setShowInvoiceDialog(true); }} data-testid="button-create-invoice">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Invoice
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Invoice</DialogTitle>
                    <DialogDescription>
                      Create a new invoice for a customer
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="invoiceCustomer">Customer</Label>
                      <Select value={invoiceForm.customerId} onValueChange={(value) => setInvoiceForm(prev => ({ ...prev, customerId: value }))}>
                        <SelectTrigger data-testid="select-invoice-customer">
                          <SelectValue placeholder="Select customer" />
                        </SelectTrigger>
                        <SelectContent>
                          {customers.map((customer: Customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.firstName} {customer.lastName} - {customer.phoneNumber}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="subtotal">Subtotal *</Label>
                        <Input
                          id="subtotal"
                          type="number"
                          step="0.01"
                          value={invoiceForm.subtotal}
                          onChange={(e) => setInvoiceForm(prev => ({ 
                            ...prev, 
                            subtotal: e.target.value,
                            totalAmount: (parseFloat(e.target.value) + parseFloat(invoiceForm.taxAmount || "0")).toFixed(2)
                          }))}
                          data-testid="input-invoice-subtotal"
                        />
                      </div>
                      <div>
                        <Label htmlFor="taxAmount">Tax Amount</Label>
                        <Input
                          id="taxAmount"
                          type="number"
                          step="0.01"
                          value={invoiceForm.taxAmount}
                          onChange={(e) => setInvoiceForm(prev => ({ 
                            ...prev, 
                            taxAmount: e.target.value,
                            totalAmount: (parseFloat(invoiceForm.subtotal || "0") + parseFloat(e.target.value || "0")).toFixed(2)
                          }))}
                          data-testid="input-invoice-tax"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="totalAmount">Total Amount</Label>
                      <Input
                        id="totalAmount"
                        type="number"
                        step="0.01"
                        value={invoiceForm.totalAmount}
                        onChange={(e) => setInvoiceForm(prev => ({ ...prev, totalAmount: e.target.value }))}
                        data-testid="input-invoice-total"
                      />
                    </div>
                    <div>
                      <Label htmlFor="invoiceNotes">Notes</Label>
                      <Textarea
                        id="invoiceNotes"
                        value={invoiceForm.notes}
                        onChange={(e) => setInvoiceForm(prev => ({ ...prev, notes: e.target.value }))}
                        rows={3}
                        data-testid="input-invoice-notes"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowInvoiceDialog(false)}>Cancel</Button>
                    <Button 
                      onClick={handleSubmitInvoice}
                      disabled={createInvoiceMutation.isPending}
                      data-testid="button-save-invoice"
                    >
                      Create Invoice
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((invoice: Invoice) => {
                      const customer = customers.find((c: Customer) => c.id === invoice.customerId);
                      return (
                        <TableRow key={invoice.id} data-testid={`row-invoice-${invoice.id}`}>
                          <TableCell>
                            <div className="font-medium">{invoice.invoiceNumber}</div>
                          </TableCell>
                          <TableCell>
                            {customer ? `${customer.firstName} ${customer.lastName}` : "Unknown Customer"}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">${invoice.totalAmount}</div>
                            <div className="text-sm text-muted-foreground">
                              Subtotal: ${invoice.subtotal}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              invoice.status === 'paid' ? 'default' : 
                              invoice.status === 'sent' ? 'secondary' : 'outline'
                            }>
                              {invoice.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {format(new Date(invoice.createdAt), 'MMM d, yyyy')}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => setSelectedInvoiceId(invoice.id)}
                                data-testid={`button-view-invoice-${invoice.id}`}
                              >
                                <Receipt className="w-3 h-3" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => {/* TODO: Implement edit invoice */}}
                                data-testid={`button-edit-invoice-${invoice.id}`}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">File Management</h2>
              <Dialog open={showFileDialog} onOpenChange={setShowFileDialog}>
                <DialogTrigger asChild>
                  <Button onClick={() => { resetFileForm(); setShowFileDialog(true); }} data-testid="button-upload-file">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload File
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Upload New File</DialogTitle>
                    <DialogDescription>
                      Upload a document, image, or other file and associate it with a customer, call, or invoice
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="fileUpload">Select File *</Label>
                      <Input
                        id="fileUpload"
                        type="file"
                        onChange={handleFileUpload}
                        data-testid="input-file-upload"
                      />
                    </div>
                    <div>
                      <Label htmlFor="fileDescription">Description</Label>
                      <Input
                        id="fileDescription"
                        placeholder="Enter file description"
                        value={fileForm.description}
                        onChange={(e) => setFileForm(prev => ({ ...prev, description: e.target.value }))}
                        data-testid="input-file-description"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="fileCustomer">Customer (Optional)</Label>
                        <Select value={fileForm.customerId} onValueChange={(value) => setFileForm(prev => ({ ...prev, customerId: value }))}>
                          <SelectTrigger data-testid="select-file-customer">
                            <SelectValue placeholder="Select customer" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">No customer</SelectItem>
                            {customers.map((customer: Customer) => (
                              <SelectItem key={customer.id} value={customer.id}>
                                {customer.firstName} {customer.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="fileCall">Call ID (Optional)</Label>
                        <Input
                          id="fileCall"
                          placeholder="Enter call ID"
                          value={fileForm.callId}
                          onChange={(e) => setFileForm(prev => ({ ...prev, callId: e.target.value }))}
                          data-testid="input-file-call-id"
                        />
                      </div>
                      <div>
                        <Label htmlFor="fileInvoice">Invoice (Optional)</Label>
                        <Select value={fileForm.invoiceId} onValueChange={(value) => setFileForm(prev => ({ ...prev, invoiceId: value }))}>
                          <SelectTrigger data-testid="select-file-invoice">
                            <SelectValue placeholder="Select invoice" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">No invoice</SelectItem>
                            {invoices.map((invoice: Invoice) => (
                              <SelectItem key={invoice.id} value={invoice.id}>
                                {invoice.invoiceNumber} - ${invoice.totalAmount}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowFileDialog(false)}>Cancel</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Associated With</TableHead>
                      <TableHead>Upload Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFiles.map((file: File) => {
                      const customer = file.customerId ? customers.find((c: Customer) => c.id === file.customerId) : null;
                      const invoice = file.invoiceId ? invoices.find((i: Invoice) => i.id === file.invoiceId) : null;
                      return (
                        <TableRow key={file.id} data-testid={`row-file-${file.id}`}>
                          <TableCell>
                            <div className="font-medium">{file.fileName}</div>
                            {file.description && (
                              <div className="text-sm text-muted-foreground">{file.description}</div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{file.fileType}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {file.fileSize ? `${(parseInt(file.fileSize) / 1024).toFixed(1)} KB` : "Unknown"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {customer && <div>Customer: {customer.firstName} {customer.lastName}</div>}
                              {invoice && <div>Invoice: {invoice.invoiceNumber}</div>}
                              {file.callId && <div>Call: {file.callId}</div>}
                              {!customer && !invoice && !file.callId && (
                                <span className="text-muted-foreground">General file</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {format(new Date(file.createdAt), 'MMM d, yyyy')}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => {
                                  // In a real app, this would download the file
                                  toast({ title: "Download started", description: `Downloading ${file.fileName}` });
                                }}
                                data-testid={`button-download-file-${file.id}`}
                              >
                                <Download className="w-3 h-3" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => deleteFileMutation.mutate(file.id)}
                                disabled={deleteFileMutation.isPending}
                                data-testid={`button-delete-file-${file.id}`}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SMS Tab */}
          <TabsContent value="sms" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">SMS Management</h2>
            </div>
            <SMSManager />
          </TabsContent>
        </Tabs>
      </main>
      
      {/* Invoice Detail Modal */}
      {selectedInvoiceId && (
        <InvoiceDetail 
          invoiceId={selectedInvoiceId} 
          onClose={() => setSelectedInvoiceId(null)} 
        />
      )}
    </div>
  );
}