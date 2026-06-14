import { CommerceFulfillmentStatus, CommerceOrderStatus, CommercePaymentStatus } from "@prisma/client";
import { z } from "zod";

import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canManageCommerce } from "@/lib/authorization";
import { createCommerceOrder } from "@/lib/commerce-service";
import { parseJsonBody } from "@/lib/request";
import { getErrorMessage } from "@/lib/error-message";
import { invalidateServerCache } from "@/lib/server-memory-cache";

const schema = z.object({
  channelId: z.string().optional(),
  projectId: z.string().optional(),
  orderNumber: z.string().min(1),
  customerName: z.string().min(2),
  customerEmail: z.string().email().optional().or(z.literal("")),
  status: z.nativeEnum(CommerceOrderStatus),
  fulfillmentStatus: z.nativeEnum(CommerceFulfillmentStatus),
  paymentStatus: z.nativeEnum(CommercePaymentStatus),
  currencyCode: z.string().min(3).max(3).optional(),
  grossCents: z.coerce.number().int().nonnegative(),
  netCents: z.coerce.number().int().nonnegative(),
  quantity: z.coerce.number().int().positive(),
  expectedShipAt: z.coerce.date().optional().nullable(),
  notes: z.string().optional()
});

export async function POST(request: Request) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!canManageCommerce(context.organizationRole, context.organizationPermissions)) {
    return forbidden("Only commerce managers can manage orders.");
  }

  try {
    const body = await parseJsonBody(request, schema);
    const order = await createCommerceOrder({
      organizationId: context.organizationId,
      userId: context.userId,
      channelId: body.channelId || null,
      projectId: body.projectId || null,
      orderNumber: body.orderNumber,
      customerName: body.customerName,
      customerEmail: body.customerEmail || null,
      status: body.status,
      fulfillmentStatus: body.fulfillmentStatus,
      paymentStatus: body.paymentStatus,
      currencyCode: body.currencyCode,
      grossCents: body.grossCents,
      netCents: body.netCents,
      quantity: body.quantity,
      expectedShipAt: body.expectedShipAt,
      notes: body.notes
    });

    invalidateServerCache(`commerce:overview:${context.organizationId}`);
    return ok(order, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid order payload.");
    }

    return serverError(getErrorMessage(error, "Não foi possível criar o pedido."));
  }
}
