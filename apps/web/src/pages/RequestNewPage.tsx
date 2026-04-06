import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import type { CatalogProduct, RequestPriority } from "@elkatech/contracts";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const RequestNewPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedProductId = searchParams.get("product") ?? "";
  const { data: products = [] } = useQuery({
    queryKey: ["catalog", "products"],
    queryFn: () => apiRequest<CatalogProduct[]>("/api/catalog/products"),
  });

  const [form, setForm] = useState({
    productId: requestedProductId,
    subject: "",
    description: "",
    contactPhone: "",
    siteLocation: "",
    serialNumber: "",
    priority: "normal" as RequestPriority,
  });

  useEffect(() => {
    if (requestedProductId) {
      setForm((current) => ({ ...current, productId: requestedProductId }));
    }
  }, [requestedProductId]);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === form.productId),
    [form.productId, products],
  );

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest<{ id: string }>("/api/requests", {
        method: "POST",
        body: JSON.stringify(form),
      }),
    onSuccess: ({ id }) => {
      toast.success("Service request created.");
      navigate(`/app/requests/${id}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border bg-card p-6 shadow-soft">
        <p className="text-sm uppercase tracking-[0.2em] text-accent">Create Request</p>
        <h2 className="mt-2 font-display text-3xl font-bold text-foreground">Request service for a listed product</h2>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          Select the affected product and describe the issue so the Elkatech service team can triage it quickly.
        </p>
      </div>

      <form
        className="grid gap-6 rounded-3xl border bg-card p-6 shadow-soft"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Product</label>
            <Select value={form.productId} onValueChange={(value) => setForm((current) => ({ ...current, productId: value }))}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Priority</label>
            <Select
              value={form.priority}
              onValueChange={(value) => setForm((current) => ({ ...current, priority: value as RequestPriority }))}
            >
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedProduct && (
          <div className="rounded-2xl border bg-muted/30 p-4 text-sm text-muted-foreground">
            Requesting support for <span className="font-semibold text-foreground">{selectedProduct.name}</span>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Subject</label>
            <Input
              required
              value={form.subject}
              onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
              placeholder="Printer not feeding media"
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Contact Phone</label>
            <Input
              required
              value={form.contactPhone}
              onChange={(event) => setForm((current) => ({ ...current, contactPhone: event.target.value }))}
              placeholder="+91 98765 43210"
              className="bg-background"
            />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Site Location</label>
            <Input
              required
              value={form.siteLocation}
              onChange={(event) => setForm((current) => ({ ...current, siteLocation: event.target.value }))}
              placeholder="Ahmedabad workshop"
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Serial Number</label>
            <Input
              value={form.serialNumber}
              onChange={(event) => setForm((current) => ({ ...current, serialNumber: event.target.value }))}
              placeholder="Optional"
              className="bg-background"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Description</label>
          <Textarea
            required
            rows={6}
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            placeholder="Describe the issue, how often it happens, and any troubleshooting already attempted."
            className="bg-background"
          />
        </div>

        <Button type="submit" variant="cta" size="lg" className="w-full md:w-fit" disabled={mutation.isPending}>
          {mutation.isPending ? "Submitting..." : "Submit service request"}
        </Button>
      </form>
    </div>
  );
};

export default RequestNewPage;
