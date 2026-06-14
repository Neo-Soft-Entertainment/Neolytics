import { NextResponse } from "next/server";

function serializeResponseData<T>(data: T) {
  return JSON.parse(
    JSON.stringify(data, (_, value) => {
      let resolvedValue0: any;
      if (typeof value === "bigint") {
        resolvedValue0 = Number(value);
      } else {
        resolvedValue0 = value;
      }
      return (resolvedValue0);
    })
  ) as T;
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(serializeResponseData(data), init);
}

export function badRequest(message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ message, ...extra }, { status: 400 });
}

export function unauthorized(message = "Não autorizado") {
  return NextResponse.json({ message }, { status: 401 });
}

export function forbidden(message = "Proibido") {
  return NextResponse.json({ message }, { status: 403 });
}

export function tooManyRequests(message = "Muitas solicitações") {
  return NextResponse.json({ message }, { status: 429 });
}

export function notFound(message = "Não encontrado") {
  return NextResponse.json({ message }, { status: 404 });
}

export function serverError(message = "Erro interno do servidor") {
  return NextResponse.json({ message }, { status: 500 });
}
