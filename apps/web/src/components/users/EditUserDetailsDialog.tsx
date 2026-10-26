import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type {
  AdminUpdateProfileInput,
  AuthUser,
  CustomerProfile,
} from "@elkatech/contracts";
import { ApiError, apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ProfileResponse = {
  user: AuthUser;
  profile: CustomerProfile;
};

type ProfileForm = {
  displayName: string;
  companyName: string;
  contactPhone: string;
  alternatePhone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

const EMPTY_FORM: ProfileForm = {
  displayName: "",
  companyName: "",
  contactPhone: "",
  alternatePhone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
};

function formFromProfile(profile: CustomerProfile): ProfileForm {
  return {
    displayName: profile.displayName,
    companyName: profile.companyName ?? "",
    contactPhone: profile.contactPhone ?? "",
    alternatePhone: profile.alternatePhone ?? "",
    addressLine1: profile.addressLine1 ?? "",
    addressLine2: profile.addressLine2 ?? "",
    city: profile.city ?? "",
    state: profile.state ?? "",
    postalCode: profile.postalCode ?? "",
    country: profile.country ?? "",
  };
}

function Field({
  label,
  required = false,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-1.5 block text-xs font-medium text-[var(--lp-ink-soft)]">
        {label}
        {required && <span className="ml-0.5 text-[var(--lp-accent)]">*</span>}
      </span>
      {children}
    </label>
  );
}

function validationMessage(form: ProfileForm, isCustomer: boolean): string | null {
  if (form.displayName.trim().length < 2) return "Enter a full name.";
  if (!isCustomer) return null;
  if (!form.companyName.trim()) return "Enter a company or workshop.";
  if (form.contactPhone.trim().length < 7) return "Enter a valid contact phone.";
  if (form.addressLine1.trim().length < 3) return "Enter a service address.";
  if (!form.city.trim()) return "Enter a city.";
  if (!form.state.trim()) return "Enter a state.";
  return null;
}

function changedPayload(
  form: ProfileForm,
  profile: CustomerProfile,
  isCustomer: boolean,
): AdminUpdateProfileInput {
  const initial = formFromProfile(profile);
  const keys: Array<keyof ProfileForm> = isCustomer
    ? [
        "displayName",
        "companyName",
        "contactPhone",
        "alternatePhone",
        "addressLine1",
        "addressLine2",
        "city",
        "state",
        "postalCode",
        "country",
      ]
    : ["displayName"];
  const payload: Record<string, string> = {};

  for (const key of keys) {
    const next = form[key].trim();
    if (next !== initial[key].trim()) payload[key] = next;
  }
  return payload as AdminUpdateProfileInput;
}

export default function EditUserDetailsDialog({
  user,
  open,
  onOpenChange,
  onSaved,
}: {
  user: AuthUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (response: ProfileResponse) => Promise<void> | void;
}) {
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const isCustomer = user?.role === "customer";

  const profileQuery = useQuery({
    queryKey: ["admin", "user", user?.id, "profile"],
    queryFn: () =>
      apiRequest<ProfileResponse>(`/api/admin/users/${user!.id}/profile`),
    enabled: open && Boolean(user?.id),
    retry: false,
  });

  useEffect(() => {
    if (open && profileQuery.data?.profile) {
      setForm(formFromProfile(profileQuery.data.profile));
    }
  }, [open, profileQuery.data?.profile]);

  const validation = validationMessage(form, isCustomer);
  const payload = useMemo(
    () =>
      profileQuery.data?.profile
        ? changedPayload(form, profileQuery.data.profile, isCustomer)
        : ({} as AdminUpdateProfileInput),
    [form, isCustomer, profileQuery.data?.profile],
  );
  const dirty = Object.keys(payload).length > 0;

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest<ProfileResponse>(`/api/admin/users/${user!.id}/profile`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: async (response) => {
      toast.success("User details updated.");
      await onSaved(response);
      onOpenChange(false);
    },
    onError: (error: unknown) =>
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Could not update user details.",
      ),
  });

  const set =
    (key: keyof ProfileForm) => (event: React.ChangeEvent<HTMLInputElement>) =>
      setForm((current) => ({ ...current, [key]: event.target.value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh_-_2rem)] w-[calc(100%_-_2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit user details</DialogTitle>
          <DialogDescription>
            Update profile and contact information. Email, role, and account
            status are managed separately.
          </DialogDescription>
        </DialogHeader>

        {profileQuery.isLoading ? (
          <div
            role="status"
            className="flex items-center justify-center gap-2 py-10 text-sm text-[var(--lp-faint)]"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading user details…
          </div>
        ) : profileQuery.isError || !profileQuery.data ? (
          <div role="alert" className="space-y-3 py-8 text-center">
            <p className="text-sm text-rose-600 dark:text-rose-300">
              Couldn&apos;t load user details.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void profileQuery.refetch()}
            >
              Try again
            </Button>
          </div>
        ) : (
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!validation && dirty) mutation.mutate();
            }}
          >
            <Field label="Full name" required>
              <Input
                value={form.displayName}
                onChange={set("displayName")}
                className="bg-background"
              />
            </Field>
            <Field label="Email">
              <Input
                value={user?.email ?? ""}
                readOnly
                disabled
                className="bg-[var(--lp-panel-2)]"
              />
            </Field>

            {isCustomer && (
              <>
                <Field label="Company / workshop" required>
                  <Input
                    value={form.companyName}
                    onChange={set("companyName")}
                    className="bg-background"
                  />
                </Field>
                <Field label="Contact phone" required>
                  <Input
                    value={form.contactPhone}
                    onChange={set("contactPhone")}
                    className="bg-background"
                  />
                </Field>
                <Field label="Alternate phone">
                  <Input
                    value={form.alternatePhone}
                    onChange={set("alternatePhone")}
                    className="bg-background"
                  />
                </Field>
                <Field label="Postal code">
                  <Input
                    value={form.postalCode}
                    onChange={set("postalCode")}
                    className="bg-background"
                  />
                </Field>
                <Field
                  label="Service address"
                  required
                  className="sm:col-span-2"
                >
                  <Input
                    value={form.addressLine1}
                    onChange={set("addressLine1")}
                    className="bg-background"
                  />
                </Field>
                <Field label="Address line 2" className="sm:col-span-2">
                  <Input
                    value={form.addressLine2}
                    onChange={set("addressLine2")}
                    className="bg-background"
                  />
                </Field>
                <Field label="City" required>
                  <Input
                    value={form.city}
                    onChange={set("city")}
                    className="bg-background"
                  />
                </Field>
                <Field label="State" required>
                  <Input
                    value={form.state}
                    onChange={set("state")}
                    className="bg-background"
                  />
                </Field>
                <Field label="Country" className="sm:col-span-2">
                  <Input
                    value={form.country}
                    onChange={set("country")}
                    className="bg-background"
                  />
                </Field>
              </>
            )}

            <div className="flex items-center justify-between gap-3 border-t border-[var(--lp-line)] pt-4 sm:col-span-2">
              <p
                className="min-w-0 text-xs text-[var(--lp-faint)]"
                aria-live="polite"
              >
                {validation ?? (dirty ? "Ready to save." : "No changes yet.")}
              </p>
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="cta"
                  disabled={Boolean(validation) || !dirty || mutation.isPending}
                >
                  {mutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Save changes
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
