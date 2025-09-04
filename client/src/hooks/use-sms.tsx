import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// SMS API response types
interface SMSResponse {
  message: string;
  phoneNumber: string;
  timestamp: string;
}

interface CustomerSMSResponse extends SMSResponse {
  customerName: string;
  messageType: string;
}

interface AppointmentReminderResponse extends SMSResponse {
  customerName: string;
  appointmentDate: string;
  appointmentTime: string;
}

interface SMSStatusResponse {
  smsServiceAvailable: boolean;
  message: string;
}

// Request types
interface SendSMSRequest {
  phoneNumber: string;
  message: string;
}

interface SendCustomerSMSRequest {
  customerId: string;
  message: string;
  messageType?: string;
}

interface SendAppointmentReminderRequest {
  customerId: string;
  appointmentDate: string;
  appointmentTime: string;
  serviceType?: string;
}

type SMSContextType = {
  smsStatus: SMSStatusResponse | undefined;
  isStatusLoading: boolean;
  statusError: Error | null;
  sendSMSMutation: UseMutationResult<SMSResponse, Error, SendSMSRequest>;
  sendCustomerSMSMutation: UseMutationResult<CustomerSMSResponse, Error, SendCustomerSMSRequest>;
  sendAppointmentReminderMutation: UseMutationResult<AppointmentReminderResponse, Error, SendAppointmentReminderRequest>;
};

export const SMSContext = createContext<SMSContextType | null>(null);

export function SMSProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();

  // Get SMS service status
  const {
    data: smsStatus,
    error: statusError,
    isLoading: isStatusLoading,
  } = useQuery<SMSStatusResponse, Error>({
    queryKey: ["/api/sms/status"],
    queryFn: getQueryFn({}),
  });

  // Send general SMS mutation
  const sendSMSMutation = useMutation({
    mutationFn: async (data: SendSMSRequest) => {
      const res = await apiRequest("POST", "/api/sms/send", data);
      return await res.json();
    },
    onSuccess: (response: SMSResponse) => {
      toast({
        title: "SMS sent successfully",
        description: `Message sent to ${response.phoneNumber}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send SMS",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Send SMS to customer mutation
  const sendCustomerSMSMutation = useMutation({
    mutationFn: async (data: SendCustomerSMSRequest) => {
      const res = await apiRequest("POST", "/api/sms/send-to-customer", data);
      return await res.json();
    },
    onSuccess: (response: CustomerSMSResponse) => {
      toast({
        title: "SMS sent to customer",
        description: `Message sent to ${response.customerName}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send SMS to customer",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Send appointment reminder mutation
  const sendAppointmentReminderMutation = useMutation({
    mutationFn: async (data: SendAppointmentReminderRequest) => {
      const res = await apiRequest("POST", "/api/sms/appointment-reminder", data);
      return await res.json();
    },
    onSuccess: (response: AppointmentReminderResponse) => {
      toast({
        title: "Appointment reminder sent",
        description: `Reminder sent to ${response.customerName} for ${response.appointmentDate}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send appointment reminder",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <SMSContext.Provider
      value={{
        smsStatus,
        isStatusLoading,
        statusError,
        sendSMSMutation,
        sendCustomerSMSMutation,
        sendAppointmentReminderMutation,
      }}
    >
      {children}
    </SMSContext.Provider>
  );
}

export function useSMS() {
  const context = useContext(SMSContext);
  if (!context) {
    throw new Error("useSMS must be used within an SMSProvider");
  }
  return context;
}