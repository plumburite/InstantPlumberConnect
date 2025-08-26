import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Home, Receipt, Star } from 'lucide-react';
import { Link } from 'wouter';

export default function PaymentSuccess() {
  useEffect(() => {
    // You could add analytics tracking here
    console.log('Payment completed successfully');
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Success Message */}
          <Card className="text-center mb-8">
            <CardHeader>
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-green-600">Payment Successful!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Your payment has been processed successfully. The plumber has been notified and will contact you shortly.
              </p>
              
              {/* Service Details */}
              <div className="bg-muted/50 p-4 rounded-lg text-left">
                <h3 className="font-semibold text-sm text-muted-foreground mb-2">SERVICE DETAILS</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Service:</span>
                    <span className="font-medium">Emergency Plumbing Service</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Plumber:</span>
                    <span className="font-medium">Mike Johnson</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Amount Paid:</span>
                    <span className="font-bold">$85.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Transaction ID:</span>
                    <span className="font-mono text-sm">TXN-{Date.now()}</span>
                  </div>
                </div>
              </div>

              {/* Next Steps */}
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-left">
                <h3 className="font-semibold text-blue-800 mb-2">What's Next?</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>✓ Your plumber has been notified of the payment</li>
                  <li>✓ You'll receive a confirmation email shortly</li>
                  <li>✓ The plumber will contact you to schedule or provide service</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button asChild variant="outline" className="flex items-center gap-2">
              <Link href="/">
                <Home className="h-4 w-4" />
                Return Home
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="flex items-center gap-2">
              <Link href="/receipt">
                <Receipt className="h-4 w-4" />
                View Receipt
              </Link>
            </Button>
            
            <Button asChild className="flex items-center gap-2">
              <Link href="/review">
                <Star className="h-4 w-4" />
                Leave Review
              </Link>
            </Button>
          </div>

          {/* Support Information */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-lg">Need Help?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                If you have any questions about your payment or service, we're here to help.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="font-medium">Customer Support</p>
                  <p className="text-sm text-muted-foreground">Available 24/7</p>
                  <p className="text-sm">support@plumberconnect.com</p>
                </div>
                <div>
                  <p className="font-medium">Emergency Line</p>
                  <p className="text-sm text-muted-foreground">For urgent issues</p>
                  <p className="text-sm font-mono">(555) 123-HELP</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}