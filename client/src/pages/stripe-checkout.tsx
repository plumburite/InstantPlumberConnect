import { useEffect, useState } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, CreditCard, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { Link } from 'wouter';

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

interface CheckoutFormProps {
  amount: number;
  plumberName: string;
  serviceDescription: string;
}

function CheckoutForm({ amount, plumberName, serviceDescription }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success`,
        },
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Payment Error",
        description: err.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Service Details */}
      <div className="bg-muted/50 p-4 rounded-lg">
        <h3 className="font-semibold text-sm text-muted-foreground mb-2">SERVICE DETAILS</h3>
        <div className="space-y-1">
          <p className="font-medium">{serviceDescription}</p>
          <p className="text-sm text-muted-foreground">Plumber: {plumberName}</p>
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="font-medium">Total Amount</span>
            <span className="font-bold text-lg">${amount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Payment Element */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          <h3 className="font-medium">Payment Information</h3>
        </div>
        <PaymentElement 
          options={{
            layout: 'tabs'
          }}
        />
      </div>

      {/* Security Notice */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 p-3 rounded">
        <Shield className="h-4 w-4" />
        <span>Your payment information is secure and encrypted</span>
      </div>

      {/* Submit Button */}
      <Button 
        type="submit" 
        className="w-full" 
        size="lg"
        disabled={!stripe || isLoading}
        data-testid="button-pay"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing Payment...
          </>
        ) : (
          `Pay $${amount.toFixed(2)}`
        )}
      </Button>
    </form>
  );
}

export default function StripeCheckout() {
  const [clientSecret, setClientSecret] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [amount] = useState(85); // Default service amount
  const [plumberName] = useState("Mike Johnson"); // This would come from props/state
  const [serviceDescription] = useState("Emergency Plumbing Service - Pipe Repair");
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    // Create PaymentIntent as soon as the page loads
    const createPaymentIntent = async () => {
      try {
        const response = await apiRequest("POST", "/api/create-payment-intent", {
          amount: amount,
          description: serviceDescription,
          customerName: user ? `${user.firstName} ${user.lastName}` : "Guest Customer",
        });
        
        const data = await response.json();
        setClientSecret(data.clientSecret);
      } catch (error: any) {
        toast({
          title: "Payment Setup Failed",
          description: error.message || "Unable to set up payment. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    createPaymentIntent();
  }, [amount, serviceDescription, user, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p>Setting up secure payment...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <p className="text-center text-muted-foreground">
              Unable to set up payment. Please try again.
            </p>
            <Button asChild className="mt-4">
              <Link href="/">Return Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stripeOptions = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
    },
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">Secure Payment</h1>
              <p className="text-muted-foreground">Complete your payment for plumbing services</p>
            </div>
          </div>

          {/* Payment Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Elements stripe={stripePromise} options={stripeOptions}>
                <CheckoutForm 
                  amount={amount}
                  plumberName={plumberName}
                  serviceDescription={serviceDescription}
                />
              </Elements>
            </CardContent>
          </Card>

          {/* Trust Indicators */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="flex flex-col items-center gap-2">
              <Shield className="h-8 w-8 text-green-600" />
              <div>
                <p className="font-medium text-sm">256-bit SSL</p>
                <p className="text-xs text-muted-foreground">Bank-level security</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <CreditCard className="h-8 w-8 text-blue-600" />
              <div>
                <p className="font-medium text-sm">Stripe Payments</p>
                <p className="text-xs text-muted-foreground">Trusted by millions</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm">
                $
              </div>
              <div>
                <p className="font-medium text-sm">Money Back</p>
                <p className="text-xs text-muted-foreground">100% satisfaction</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}