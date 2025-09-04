import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSMS } from "@/hooks/use-sms";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { 
  MessageSquare, Send, Phone, Calendar, User, Clock, CheckCircle, AlertCircle 
} from "lucide-react";
import type { Customer } from "@shared/schema";

export default function SMSManager() {
  const { user } = useAuth();
  const { 
    smsStatus, 
    isStatusLoading, 
    sendSMSMutation, 
    sendCustomerSMSMutation, 
    sendAppointmentReminderMutation 
  } = useSMS();

  // Form states
  const [generalSMSForm, setGeneralSMSForm] = useState({
    phoneNumber: "",
    message: ""
  });

  const [customerSMSForm, setCustomerSMSForm] = useState({
    customerId: "",
    message: "",
    messageType: "general"
  });

  const [appointmentForm, setAppointmentForm] = useState({
    customerId: "",
    appointmentDate: "",
    appointmentTime: "",
    serviceType: ""
  });

  const [showQuickMessageDialog, setShowQuickMessageDialog] = useState(false);
  const [selectedQuickMessage, setSelectedQuickMessage] = useState("");

  // Load customers for dropdowns
  const { data: customers = [] } = useQuery<Customer[]>({ queryKey: ["/api/customers"] });

  // Quick message templates
  const quickMessages = [
    "Hi! This is a reminder that I'll be arriving shortly for your plumbing appointment.",
    "Your plumbing repair is complete. Thank you for choosing our services!",
    "We're running about 15 minutes late for your appointment. Sorry for the delay!",
    "Your plumbing estimate is ready. Please let me know when you'd like to review it.",
    "Thank you for your business! Please don't hesitate to call if you need anything else."
  ];

  const handleGeneralSMSSend = () => {
    if (!generalSMSForm.phoneNumber || !generalSMSForm.message) return;
    
    sendSMSMutation.mutate({
      phoneNumber: generalSMSForm.phoneNumber,
      message: generalSMSForm.message
    }, {
      onSuccess: () => {
        setGeneralSMSForm({ phoneNumber: "", message: "" });
      }
    });
  };

  const handleCustomerSMSSend = () => {
    if (!customerSMSForm.customerId || !customerSMSForm.message) return;
    
    sendCustomerSMSMutation.mutate({
      customerId: customerSMSForm.customerId,
      message: customerSMSForm.message,
      messageType: customerSMSForm.messageType
    }, {
      onSuccess: () => {
        setCustomerSMSForm({ customerId: "", message: "", messageType: "general" });
      }
    });
  };

  const handleAppointmentReminderSend = () => {
    if (!appointmentForm.customerId || !appointmentForm.appointmentDate || !appointmentForm.appointmentTime) return;
    
    sendAppointmentReminderMutation.mutate({
      customerId: appointmentForm.customerId,
      appointmentDate: appointmentForm.appointmentDate,
      appointmentTime: appointmentForm.appointmentTime,
      serviceType: appointmentForm.serviceType
    }, {
      onSuccess: () => {
        setAppointmentForm({ customerId: "", appointmentDate: "", appointmentTime: "", serviceType: "" });
      }
    });
  };

  const handleQuickMessageSelect = (message: string) => {
    setSelectedQuickMessage(message);
    if (customerSMSForm.customerId) {
      setCustomerSMSForm(prev => ({ ...prev, message }));
    } else {
      setGeneralSMSForm(prev => ({ ...prev, message }));
    }
    setShowQuickMessageDialog(false);
  };

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length >= 10) {
      return numbers.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
    }
    return value;
  };

  const handlePhoneNumberChange = (value: string) => {
    const formatted = formatPhoneNumber(value);
    setGeneralSMSForm(prev => ({ ...prev, phoneNumber: formatted }));
  };

  if (isStatusLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading SMS service status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* SMS Service Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            SMS Service Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            {smsStatus?.smsServiceAvailable ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  SMS Ready
                </Badge>
                <span className="text-sm text-muted-foreground">SMS service is configured and ready to send messages</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-orange-500" />
                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                  SMS Not Available
                </Badge>
                <span className="text-sm text-muted-foreground">SMS service requires Twilio configuration</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* SMS Tabs */}
      <Tabs defaultValue="customer" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="customer" data-testid="tab-customer-sms">
            <User className="h-4 w-4 mr-2" />
            Customer SMS
          </TabsTrigger>
          <TabsTrigger value="general" data-testid="tab-general-sms">
            <Phone className="h-4 w-4 mr-2" />
            General SMS
          </TabsTrigger>
          <TabsTrigger value="appointment" data-testid="tab-appointment-sms">
            <Calendar className="h-4 w-4 mr-2" />
            Appointment Reminders
          </TabsTrigger>
        </TabsList>

        {/* Customer SMS Tab */}
        <TabsContent value="customer" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Send SMS to Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customer-select">Select Customer</Label>
                <Select 
                  value={customerSMSForm.customerId} 
                  onValueChange={(value) => setCustomerSMSForm(prev => ({ ...prev, customerId: value }))}
                >
                  <SelectTrigger data-testid="select-customer">
                    <SelectValue placeholder="Choose a customer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.firstName} {customer.lastName} - {customer.phoneNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message-type">Message Type</Label>
                <Select
                  value={customerSMSForm.messageType}
                  onValueChange={(value) => setCustomerSMSForm(prev => ({ ...prev, messageType: value }))}
                >
                  <SelectTrigger data-testid="select-message-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Message</SelectItem>
                    <SelectItem value="service_update">Service Update</SelectItem>
                    <SelectItem value="follow_up">Follow-up</SelectItem>
                    <SelectItem value="payment_reminder">Payment Reminder</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="customer-message">Message</Label>
                  <Dialog open={showQuickMessageDialog} onOpenChange={setShowQuickMessageDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" data-testid="button-quick-messages">
                        Quick Messages
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Select Quick Message</DialogTitle>
                        <DialogDescription>
                          Choose from pre-written message templates
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-2">
                        {quickMessages.map((message, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            className="w-full text-left justify-start h-auto p-3"
                            onClick={() => handleQuickMessageSelect(message)}
                            data-testid={`quick-message-${index}`}
                          >
                            {message}
                          </Button>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <Textarea
                  id="customer-message"
                  placeholder="Type your message..."
                  value={customerSMSForm.message}
                  onChange={(e) => setCustomerSMSForm(prev => ({ ...prev, message: e.target.value }))}
                  rows={4}
                  maxLength={160}
                  data-testid="textarea-customer-message"
                />
                <div className="text-sm text-muted-foreground text-right">
                  {customerSMSForm.message.length}/160 characters
                </div>
              </div>

              <Button 
                onClick={handleCustomerSMSSend}
                disabled={!smsStatus?.smsServiceAvailable || !customerSMSForm.customerId || !customerSMSForm.message || sendCustomerSMSMutation.isPending}
                className="w-full"
                data-testid="button-send-customer-sms"
              >
                {sendCustomerSMSMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send SMS to Customer
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* General SMS Tab */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Send General SMS</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone-number">Phone Number</Label>
                <Input
                  id="phone-number"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={generalSMSForm.phoneNumber}
                  onChange={(e) => handlePhoneNumberChange(e.target.value)}
                  maxLength={14}
                  data-testid="input-phone-number"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="general-message">Message</Label>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowQuickMessageDialog(true)}
                    data-testid="button-general-quick-messages"
                  >
                    Quick Messages
                  </Button>
                </div>
                <Textarea
                  id="general-message"
                  placeholder="Type your message..."
                  value={generalSMSForm.message}
                  onChange={(e) => setGeneralSMSForm(prev => ({ ...prev, message: e.target.value }))}
                  rows={4}
                  maxLength={160}
                  data-testid="textarea-general-message"
                />
                <div className="text-sm text-muted-foreground text-right">
                  {generalSMSForm.message.length}/160 characters
                </div>
              </div>

              <Button 
                onClick={handleGeneralSMSSend}
                disabled={!smsStatus?.smsServiceAvailable || !generalSMSForm.phoneNumber || !generalSMSForm.message || sendSMSMutation.isPending}
                className="w-full"
                data-testid="button-send-general-sms"
              >
                {sendSMSMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send SMS
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appointment Reminders Tab */}
        <TabsContent value="appointment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Send Appointment Reminder</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="appointment-customer">Customer</Label>
                  <Select
                    value={appointmentForm.customerId}
                    onValueChange={(value) => setAppointmentForm(prev => ({ ...prev, customerId: value }))}
                  >
                    <SelectTrigger data-testid="select-appointment-customer">
                      <SelectValue placeholder="Choose customer..." />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.firstName} {customer.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="service-type">Service Type (Optional)</Label>
                  <Input
                    id="service-type"
                    placeholder="e.g., Leak repair, Drain cleaning"
                    value={appointmentForm.serviceType}
                    onChange={(e) => setAppointmentForm(prev => ({ ...prev, serviceType: e.target.value }))}
                    data-testid="input-service-type"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="appointment-date">Appointment Date</Label>
                  <Input
                    id="appointment-date"
                    type="date"
                    value={appointmentForm.appointmentDate}
                    onChange={(e) => setAppointmentForm(prev => ({ ...prev, appointmentDate: e.target.value }))}
                    data-testid="input-appointment-date"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="appointment-time">Appointment Time</Label>
                  <Input
                    id="appointment-time"
                    type="time"
                    value={appointmentForm.appointmentTime}
                    onChange={(e) => setAppointmentForm(prev => ({ ...prev, appointmentTime: e.target.value }))}
                    data-testid="input-appointment-time"
                  />
                </div>
              </div>

              <Separator />

              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Preview Message
                </h4>
                <p className="text-sm text-muted-foreground">
                  This will send a formatted appointment reminder including your plumber details and the appointment information.
                </p>
              </div>

              <Button 
                onClick={handleAppointmentReminderSend}
                disabled={!smsStatus?.smsServiceAvailable || !appointmentForm.customerId || !appointmentForm.appointmentDate || !appointmentForm.appointmentTime || sendAppointmentReminderMutation.isPending}
                className="w-full"
                data-testid="button-send-appointment-reminder"
              >
                {sendAppointmentReminderMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Calendar className="h-4 w-4 mr-2" />
                    Send Appointment Reminder
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}