"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { CompanyLegalEntityRecord } from "@/components/company/company-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  countryOptions,
  getBusinessActivityLabel,
  getBusinessActivityPlaceholder,
  getRegistrationLabel,
  getRegistrationPendingLabel,
  getRegistrationPlaceholder,
  languageOptions
} from "@/lib/company-localization";

const taxRegimes = [
  "MEI",
  "SIMPLES_NACIONAL",
  "LUCRO_PRESUMIDO",
  "LUCRO_REAL",
  "OTHER"
] as const;

export function CompanyProfilePanel({
  legalEntities,
  canManage,
  organizationCountryCode,
  organizationDefaultLanguage
}: {
  legalEntities: CompanyLegalEntityRecord[];
  canManage: boolean;
  organizationCountryCode: string;
  organizationDefaultLanguage: string;
}) {
  const router = useRouter();
  const [createError, setCreateError] = useState<string | null>(null);
  const [defaultsMessage, setDefaultsMessage] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSavingDefaults, setIsSavingDefaults] = useState(false);
  const [createCountryCode, setCreateCountryCode] = useState(organizationCountryCode);

  async function saveDefaults(formData: FormData) {
    if (!canManage) {
      return;
    }

    setDefaultsMessage(null);
    setIsSavingDefaults(true);

    const response = await fetch("/api/company/defaults", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        defaultLanguage: formData.get("defaultLanguage"),
        countryCode: formData.get("countryCode")
      })
    });

    setIsSavingDefaults(false);

    const payload = (await response.json().catch(() => null)) as { message?: string } | null;

    if (!response.ok) {
      setDefaultsMessage(payload?.message ?? "Unable to save company defaults.");
      return;
    }

    setDefaultsMessage("Company defaults updated.");
    router.refresh();
  }

  async function createEntity(formData: FormData) {
    if (!canManage) {
      return;
    }

    setCreateError(null);
    setIsCreating(true);

    const response = await fetch("/api/company/legal-entities", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: formData.get("name"),
        tradeName: formData.get("tradeName"),
        cnpj: formData.get("cnpj"),
        countryCode: formData.get("countryCode"),
        legalNature: formData.get("legalNature"),
        taxRegime: formData.get("taxRegime"),
        cnaePrimary: formData.get("cnaePrimary"),
        email: formData.get("email"),
        phone: formData.get("phone"),
        websiteUrl: formData.get("websiteUrl"),
        city: formData.get("city"),
        state: formData.get("state")
      })
    });

    setIsCreating(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setCreateError(payload?.message ?? "Unable to create legal entity.");
      return;
    }

    const form = document.getElementById("create-legal-entity-form") as HTMLFormElement | null;
    form?.reset();
    setCreateCountryCode(organizationCountryCode);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Organization defaults</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
            onSubmit={(event) => {
              event.preventDefault();
              void saveDefaults(new FormData(event.currentTarget));
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="organization-default-language">Default language</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                defaultValue={organizationDefaultLanguage}
                disabled={!canManage || isSavingDefaults}
                id="organization-default-language"
                name="defaultLanguage"
              >
                {languageOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="organization-country-code">Home country</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                defaultValue={organizationCountryCode}
                disabled={!canManage || isSavingDefaults}
                id="organization-country-code"
                name="countryCode"
              >
                {countryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-sm text-muted-foreground xl:col-span-2">
              These defaults define the initial language and country context for company compliance.
              Each legal entity can still override its country based on its own registration and address.
            </div>
            <div className="md:col-span-2 xl:col-span-4">
              <Button disabled={!canManage || isSavingDefaults} type="submit">
                {isSavingDefaults ? "Saving..." : "Save organization defaults"}
              </Button>
            </div>
          </form>
          {defaultsMessage ? <p className="mt-3 text-sm text-muted-foreground">{defaultsMessage}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Company dossier</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-4">
          <div className="rounded-xl border p-3">
            <p className="text-muted-foreground">Legal entities</p>
            <p className="mt-1 text-2xl font-semibold">{legalEntities.length}</p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="text-muted-foreground">Branches</p>
            <p className="mt-1 text-2xl font-semibold">
              {legalEntities.reduce((total, entity) => total + entity.branches.length, 0)}
            </p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="text-muted-foreground">Shareholders</p>
            <p className="mt-1 text-2xl font-semibold">
              {legalEntities.reduce((total, entity) => total + entity.shareholders.length, 0)}
            </p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="text-muted-foreground">Officers</p>
            <p className="mt-1 text-2xl font-semibold">
              {legalEntities.reduce((total, entity) => total + entity.officers.length, 0)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Create legal entity</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            id="create-legal-entity-form"
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
            onSubmit={(event) => {
              event.preventDefault();
              void createEntity(new FormData(event.currentTarget));
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="entity-name">Legal name</Label>
              <Input disabled={!canManage || isCreating} id="entity-name" name="name" placeholder="Northstar Studios LLC" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="entity-trade-name">Trade name</Label>
              <Input disabled={!canManage || isCreating} id="entity-trade-name" name="tradeName" placeholder="Northstar" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="entity-cnpj">{getRegistrationLabel(createCountryCode)}</Label>
              <Input
                disabled={!canManage || isCreating}
                id="entity-cnpj"
                name="cnpj"
                placeholder={getRegistrationPlaceholder(createCountryCode)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="entity-country">Country</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={!canManage || isCreating}
                id="entity-country"
                name="countryCode"
                onChange={(event) => setCreateCountryCode(event.target.value)}
                value={createCountryCode}
              >
                {countryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="entity-tax-regime">Tax regime</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                defaultValue="OTHER"
                disabled={!canManage || isCreating}
                id="entity-tax-regime"
                name="taxRegime"
              >
                {taxRegimes.map((taxRegime) => (
                  <option key={taxRegime} value={taxRegime}>
                    {taxRegime}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="entity-legal-nature">Legal nature</Label>
              <Input disabled={!canManage || isCreating} id="entity-legal-nature" name="legalNature" placeholder="Limited liability company" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="entity-cnae">{getBusinessActivityLabel(createCountryCode)}</Label>
              <Input
                disabled={!canManage || isCreating}
                id="entity-cnae"
                name="cnaePrimary"
                placeholder={getBusinessActivityPlaceholder(createCountryCode)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="entity-email">Email</Label>
              <Input disabled={!canManage || isCreating} id="entity-email" name="email" placeholder="finance@studio.com" type="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="entity-phone">Phone</Label>
              <Input disabled={!canManage || isCreating} id="entity-phone" name="phone" placeholder="+1 415 555 0101" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="entity-website">Website</Label>
              <Input disabled={!canManage || isCreating} id="entity-website" name="websiteUrl" placeholder="https://studio.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="entity-city">City</Label>
              <Input disabled={!canManage || isCreating} id="entity-city" name="city" placeholder="San Francisco" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="entity-state">State / province</Label>
              <Input disabled={!canManage || isCreating} id="entity-state" name="state" placeholder="CA" />
            </div>
            <div className="flex items-end">
              <Button disabled={!canManage || isCreating} type="submit">
                {isCreating ? "Creating..." : "Create legal entity"}
              </Button>
            </div>
          </form>
          {createError ? <p className="mt-3 text-sm text-destructive">{createError}</p> : null}
          {!canManage ? (
            <p className="mt-3 text-sm text-muted-foreground">Only organization admins can create or edit company records.</p>
          ) : null}
        </CardContent>
      </Card>

      {legalEntities.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            No legal entities yet. Create the main company record to start the registration and document workflow.
          </CardContent>
        </Card>
      ) : null}

      {legalEntities.map((entity) => (
        <LegalEntityCard
          key={entity.id}
          canManage={canManage}
          entity={entity}
          organizationCountryCode={organizationCountryCode}
        />
      ))}
    </div>
  );
}

function LegalEntityCard({
  entity,
  canManage,
  organizationCountryCode
}: {
  entity: CompanyLegalEntityRecord;
  canManage: boolean;
  organizationCountryCode: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [countryCode, setCountryCode] = useState(entity.countryCode || organizationCountryCode);

  async function saveProfile(formData: FormData) {
    if (!canManage) {
      return;
    }

    setMessage(null);
    setIsSaving(true);

    const response = await fetch(`/api/company/legal-entities/${entity.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: formData.get("name"),
        tradeName: formData.get("tradeName"),
        cnpj: formData.get("cnpj"),
        countryCode: formData.get("countryCode"),
        legalNature: formData.get("legalNature"),
        taxRegime: formData.get("taxRegime"),
        cnaePrimary: formData.get("cnaePrimary"),
        email: formData.get("email"),
        phone: formData.get("phone"),
        websiteUrl: formData.get("websiteUrl"),
        city: formData.get("city"),
        state: formData.get("state"),
        addressLine1: formData.get("addressLine1"),
        district: formData.get("district"),
        postalCode: formData.get("postalCode"),
        notes: formData.get("notes")
      })
    });

    setIsSaving(false);

    const payload = (await response.json().catch(() => null)) as { message?: string } | null;

    if (!response.ok) {
      setMessage(payload?.message ?? "Unable to save legal entity.");
      return;
    }

    setMessage("Company profile updated.");
    router.refresh();
  }

  async function submitMiniForm(endpoint: string, formData: FormData, successMessage: string) {
    if (!canManage) {
      return;
    }

    setMessage(null);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(Object.fromEntries(formData.entries()))
    });

    const payload = (await response.json().catch(() => null)) as { message?: string } | null;

    if (!response.ok) {
      setMessage(payload?.message ?? "Unable to save record.");
      return;
    }

    setMessage(successMessage);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <CardTitle>{entity.name}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {entity.tradeName || "No trade name"} · {entity.cnpj || getRegistrationPendingLabel(countryCode)}
          </p>
        </div>
        <Badge variant="secondary">{entity.taxRegime}</Badge>
      </CardHeader>
      <CardContent className="space-y-6">
        <form
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
          onSubmit={(event) => {
            event.preventDefault();
            void saveProfile(new FormData(event.currentTarget));
          }}
        >
          <div className="space-y-2">
            <Label>Legal name</Label>
            <Input defaultValue={entity.name} disabled={!canManage || isSaving} name="name" />
          </div>
          <div className="space-y-2">
            <Label>Trade name</Label>
            <Input defaultValue={entity.tradeName ?? ""} disabled={!canManage || isSaving} name="tradeName" />
          </div>
          <div className="space-y-2">
            <Label>{getRegistrationLabel(countryCode)}</Label>
            <Input
              defaultValue={entity.cnpj ?? ""}
              disabled={!canManage || isSaving}
              name="cnpj"
              placeholder={getRegistrationPlaceholder(countryCode)}
            />
          </div>
          <div className="space-y-2">
            <Label>Country</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              disabled={!canManage || isSaving}
              name="countryCode"
              onChange={(event) => setCountryCode(event.target.value)}
              value={countryCode}
            >
              {countryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Tax regime</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue={entity.taxRegime}
              disabled={!canManage || isSaving}
              name="taxRegime"
            >
              {taxRegimes.map((taxRegime) => (
                <option key={taxRegime} value={taxRegime}>
                  {taxRegime}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Legal nature</Label>
            <Input defaultValue={entity.legalNature ?? ""} disabled={!canManage || isSaving} name="legalNature" />
          </div>
          <div className="space-y-2">
            <Label>{getBusinessActivityLabel(countryCode)}</Label>
            <Input
              defaultValue={entity.cnaePrimary ?? ""}
              disabled={!canManage || isSaving}
              name="cnaePrimary"
              placeholder={getBusinessActivityPlaceholder(countryCode)}
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input defaultValue={entity.email ?? ""} disabled={!canManage || isSaving} name="email" type="email" />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input defaultValue={entity.phone ?? ""} disabled={!canManage || isSaving} name="phone" />
          </div>
          <div className="space-y-2">
            <Label>Website</Label>
            <Input defaultValue={entity.websiteUrl ?? ""} disabled={!canManage || isSaving} name="websiteUrl" />
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input defaultValue={entity.addressLine1 ?? ""} disabled={!canManage || isSaving} name="addressLine1" />
          </div>
          <div className="space-y-2">
            <Label>Region / district</Label>
            <Input defaultValue={entity.district ?? ""} disabled={!canManage || isSaving} name="district" />
          </div>
          <div className="space-y-2">
            <Label>Postal code</Label>
            <Input defaultValue={entity.postalCode ?? ""} disabled={!canManage || isSaving} name="postalCode" />
          </div>
          <div className="space-y-2">
            <Label>City</Label>
            <Input defaultValue={entity.city ?? ""} disabled={!canManage || isSaving} name="city" />
          </div>
          <div className="space-y-2">
            <Label>State / province</Label>
            <Input defaultValue={entity.state ?? ""} disabled={!canManage || isSaving} name="state" />
          </div>
          <div className="space-y-2 md:col-span-2 xl:col-span-3">
            <Label>Notes</Label>
            <Textarea defaultValue={entity.notes ?? ""} disabled={!canManage || isSaving} name="notes" />
          </div>
          <div className="md:col-span-2 xl:col-span-3">
            <Button disabled={!canManage || isSaving} type="submit">
              {isSaving ? "Saving..." : "Save company profile"}
            </Button>
          </div>
        </form>

        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

        <div className="grid gap-4 xl:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Branches</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entity.branches.map((branch) => (
                    <TableRow key={branch.id}>
                      <TableCell>{branch.name}</TableCell>
                      <TableCell>{branch.code || "—"}</TableCell>
                      <TableCell>{[branch.city, branch.state].filter(Boolean).join(" / ") || "—"}</TableCell>
                    </TableRow>
                  ))}
                  {entity.branches.length === 0 ? (
                    <TableRow>
                      <TableCell className="text-muted-foreground" colSpan={3}>
                        No branches registered.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
              <form
                className="grid gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submitMiniForm(
                    `/api/company/legal-entities/${entity.id}/branches`,
                    new FormData(event.currentTarget),
                    "Branch created."
                  );
                }}
              >
                <Input disabled={!canManage} name="name" placeholder="Branch name" />
                <Input disabled={!canManage} name="code" placeholder="Code" />
                <div className="grid grid-cols-2 gap-2">
                  <Input disabled={!canManage} name="city" placeholder="City" />
                  <Input disabled={!canManage} name="state" placeholder="State / province" />
                </div>
                <Button disabled={!canManage} size="sm" type="submit">
                  Add branch
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Shareholders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Ownership</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entity.shareholders.map((shareholder) => (
                    <TableRow key={shareholder.id}>
                      <TableCell>{shareholder.name}</TableCell>
                      <TableCell>{shareholder.role || "—"}</TableCell>
                      <TableCell>{shareholder.ownershipPercent ? `${shareholder.ownershipPercent}%` : "—"}</TableCell>
                    </TableRow>
                  ))}
                  {entity.shareholders.length === 0 ? (
                    <TableRow>
                      <TableCell className="text-muted-foreground" colSpan={3}>
                        No shareholders registered.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
              <form
                className="grid gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submitMiniForm(
                    `/api/company/legal-entities/${entity.id}/shareholders`,
                    new FormData(event.currentTarget),
                    "Shareholder created."
                  );
                }}
              >
                <Input disabled={!canManage} name="name" placeholder="Shareholder name" />
                <Input disabled={!canManage} name="documentNumber" placeholder="National ID or tax ID" />
                <div className="grid grid-cols-2 gap-2">
                  <Input disabled={!canManage} name="role" placeholder="Role" />
                  <Input disabled={!canManage} name="ownershipPercent" placeholder="Ownership %" type="number" />
                </div>
                <Button disabled={!canManage} size="sm" type="submit">
                  Add shareholder
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Officers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Email</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entity.officers.map((officer) => (
                    <TableRow key={officer.id}>
                      <TableCell>{officer.name}</TableCell>
                      <TableCell>{officer.title}</TableCell>
                      <TableCell>{officer.email || "—"}</TableCell>
                    </TableRow>
                  ))}
                  {entity.officers.length === 0 ? (
                    <TableRow>
                      <TableCell className="text-muted-foreground" colSpan={3}>
                        No officers registered.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
              <form
                className="grid gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submitMiniForm(
                    `/api/company/legal-entities/${entity.id}/officers`,
                    new FormData(event.currentTarget),
                    "Officer created."
                  );
                }}
              >
                <Input disabled={!canManage} name="name" placeholder="Officer name" />
                <Input disabled={!canManage} name="title" placeholder="Title" />
                <Input disabled={!canManage} name="email" placeholder="Email" type="email" />
                <Button disabled={!canManage} size="sm" type="submit">
                  Add officer
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
