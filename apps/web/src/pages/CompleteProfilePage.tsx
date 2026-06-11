import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { AuthUser, CompleteProfileInput, CustomerProfile } from "@elkatech/contracts";
import AuthPageShell from "@/components/AuthPageShell";
import { ApiError, apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ProfileResponse = { user: AuthUser; profile: CustomerProfile };

const emptyForm = {
  displayName: "",
  companyName: "",
  contactPhone: "",
  alternatePhone: "",
  addressLine1: "",
  city: "",
  state: "",
  postalCode: "",
};

type FormState = typeof emptyForm;

const CompleteProfilePage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(emptyForm);

  // Prefill from any details we already have (e.g. Google name, a partial
  // earlier save).
  const profileQuery = useQuery({
    queryKey: ["me", "profile"],
    queryFn: () => apiRequest<ProfileResponse>("/api/me/profile"),
  });

  useEffect(() => {
    const p = profileQuery.data?.profile;
    if (!p) return;
    setForm((current) => ({
      displayName: current.displayName || p.displayName || "",
      companyName: current.companyName || p.companyName || "",
      contactPhone: current.contactPhone || p.contactPhone || "",
      alternatePhone: current.alternatePhone || p.alternatePhone || "",
      addressLine1: current.addressLine1 || p.addressLine1 || "",
      city: current.city || p.city || "",
      state: current.state || p.state || "",
      postalCode: current.postalCode || p.postalCode || "",
    }));
  }, [profileQuery.data]);

  const set = (key: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const mutation = useMutation({
    mutationFn: () => {
      // Only send fields that have a value; the optional ones are dropped so
      // empty strings don't get persisted.
      const payload: Partial<CompleteProfileInput> = {
        displayName: form.displayName.trim(),
        companyName: form.companyName.trim(),
        contactPhone: form.contactPhone.trim(),
        addressLine1: form.addressLine1.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
      };
      if (form.alternatePhone.trim()) payload.alternatePhone = form.alternatePhone.trim();
      if (form.postalCode.trim()) payload.postalCode = form.postalCode.trim();
      return apiRequest<ProfileResponse>("/api/me/profile", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: async (result) => {
      // Seed the session cache so ProtectedRoute sees profileCompleted=true on
      // the next render and doesn't bounce us back here.
      if (result?.user) {
        queryClient.setQueryData(["session"], { user: result.user });
      }
      await queryClient.invalidateQueries({ queryKey: ["session"] });
      await queryClient.invalidateQueries({ queryKey: ["me", "profile"] });
      toast.success("Profile saved.");
      // Approved users land in their requests; pending users see the existing
      // approval state there.
      navigate("/app/requests");
    },
    onError: (error: unknown) => {
      toast.error(error instanceof ApiError ? error.message : "Could not save your profile.");
    },
  });

  const requiredFilled =
    form.displayName.trim() &&
    form.companyName.trim() &&
    form.contactPhone.trim() &&
    form.addressLine1.trim() &&
    form.city.trim() &&
    form.state.trim();

  return (
    <AuthPageShell
      title="Complete your service profile"
      subtitle="Add your contact and workshop details so our team can support you faster."
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!requiredFilled) {
            toast.error("Please fill in all required fields.");
            return;
          }
          mutation.mutate();
        }}
      >
        <Labeled label="Full name" required>
          <Input
            required
            value={form.displayName}
            onChange={set("displayName")}
            placeholder="Your full name"
            autoComplete="name"
            className="bg-background"
          />
        </Labeled>

        <Labeled label="Workshop / Company name" required>
          <Input
            required
            value={form.companyName}
            onChange={set("companyName")}
            placeholder="Your workshop or company"
            autoComplete="organization"
            className="bg-background"
          />
        </Labeled>

        <div className="grid gap-4 sm:grid-cols-2">
          <Labeled label="Contact phone" required>
            <Input
              required
              value={form.contactPhone}
              onChange={set("contactPhone")}
              placeholder="Phone number"
              autoComplete="tel"
              inputMode="tel"
              className="bg-background"
            />
          </Labeled>
          <Labeled label="Alternate phone">
            <Input
              value={form.alternatePhone}
              onChange={set("alternatePhone")}
              placeholder="Optional"
              inputMode="tel"
              className="bg-background"
            />
          </Labeled>
        </div>

        <Labeled label="Primary service address" required>
          <Input
            required
            value={form.addressLine1}
            onChange={set("addressLine1")}
            placeholder="Workshop / service address"
            autoComplete="street-address"
            className="bg-background"
          />
        </Labeled>

        <div className="grid gap-4 sm:grid-cols-3">
          <Labeled label="City" required>
            <Input
              required
              value={form.city}
              onChange={set("city")}
              placeholder="City"
              className="bg-background"
            />
          </Labeled>
          <Labeled label="State" required>
            <Input
              required
              value={form.state}
              onChange={set("state")}
              placeholder="State"
              className="bg-background"
            />
          </Labeled>
          <Labeled label="Postal code">
            <Input
              value={form.postalCode}
              onChange={set("postalCode")}
              placeholder="Optional"
              inputMode="numeric"
              className="bg-background"
            />
          </Labeled>
        </div>

        <Button
          type="submit"
          variant="cta"
          size="lg"
          className="w-full"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save and continue"
          )}
        </Button>
      </form>
    </AuthPageShell>
  );
};

function Labeled({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-accent">*</span>}
      </label>
      {children}
    </div>
  );
}

export default CompleteProfilePage;
