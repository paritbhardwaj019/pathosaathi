import { Request, Response, NextFunction } from "express";
import { Models } from "../services/model-factory.service";
import { ApiResponse } from "../utils/apiResponse.util";
import { IPartner, IPartnerModel } from "../models/partner.model";
import { IBranding } from "../models/branding.model";

export interface TenantRequest extends Request {
  tenant?: {
    type: "ROOT" | "PARTNER";
    subdomain?: string;
    customDomain?: string;
    partner?: IPartner;
    branding?: IBranding;
    isMainDomain: boolean;
  };
}

export class MultiTenantMiddleware {
  static async resolveTenant(
    req: TenantRequest,
    _res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const hostname = MultiTenantMiddleware.extractHostname(req);

      console.log(`[MultiTenant] Resolving tenant for hostname: ${hostname}`);

      if (MultiTenantMiddleware.isMainDomain(hostname)) {
        req.tenant = {
          type: "ROOT",
          isMainDomain: true,
        };
        console.log(`[MultiTenant] Resolved to ROOT tenant`);
        next();
        return;
      }

      const partner = await MultiTenantMiddleware.findPartnerByHostname(
        hostname
      );

      if (partner) {
        let branding: IBranding | undefined;
        if (partner.branding) {
          const Branding = Models.getBranding();
          const brandingDoc = await Branding.findById(partner.branding);
          if (brandingDoc) {
            branding = brandingDoc;
          }
        }

        req.tenant = {
          type: "PARTNER",
          subdomain: partner.subdomain,
          customDomain: partner.customDomain,
          partner,
          branding,
          isMainDomain: false,
        };

        console.log(
          `[MultiTenant] Resolved to PARTNER tenant: ${partner.companyName}`
        );
      } else {
        req.tenant = {
          type: "ROOT",
          isMainDomain: false,
        };
        console.log(
          `[MultiTenant] No partner found, defaulting to ROOT tenant`
        );
      }

      next();
    } catch (error) {
      console.error("[MultiTenant] Error resolving tenant:", error);
      req.tenant = {
        type: "ROOT",
        isMainDomain: false,
      };

      next();
    }
  }

  static requirePartnerTenant(
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ): void {
    if (!req.tenant || req.tenant.type !== "PARTNER" || !req.tenant.partner) {
      ApiResponse.forbidden(res, "Access restricted to partner domains");
      return;
    }

    if (!req.tenant.partner.isActive) {
      ApiResponse.forbidden(res, "Partner account is inactive");
      return;
    }

    next();
  }

  static requireMainDomain(
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ): void {
    if (!req.tenant || !req.tenant.isMainDomain) {
      ApiResponse.forbidden(res, "Access restricted to main platform domain");
      return;
    }

    next();
  }

  static async getTenantBranding(
    req: TenantRequest
  ): Promise<IBranding | null> {
    if (!req.tenant) {
      return null;
    }

    if (req.tenant.type === "PARTNER" && req.tenant.branding) {
      return req.tenant.branding;
    }

    if (req.tenant.type === "ROOT") {
      const Branding = Models.getBranding();
      return await Branding.findOne({ isDefault: true });
    }

    return null;
  }

  private static extractHostname(req: Request): string {
    const hostHeader = req.get("host");
    if (hostHeader) {
      // Remove port if present
      return hostHeader.split(":")[0].toLowerCase();
    }

    const originHeader = req.get("origin");
    if (originHeader) {
      try {
        const url = new URL(originHeader);
        return url.hostname.toLowerCase();
      } catch (error) {
        console.warn("[MultiTenant] Invalid origin header:", originHeader);
      }
    }

    return "localhost";
  }

  private static isMainDomain(hostname: string): boolean {
    const mainDomains = [
      "pathosaathi.in",
      "www.pathosaathi.in",
      "app.pathosaathi.in",
      "admin.pathosaathi.in",
      "api.pathosaathi.in",
      "localhost",
      "127.0.0.1",
    ];

    return mainDomains.includes(hostname.toLowerCase());
  }

  private static extractSubdomain(hostname: string): string | null {
    const parts = hostname.split(".");

    if (hostname.includes("127.0.0.1") || hostname.includes("localhost")) {
      if (parts.length >= 2) {
        const subdomain = parts[0];
        if (subdomain && subdomain !== "www" && subdomain !== "localhost") {
          return subdomain;
        }
      }
      return null;
    }

    if (parts.length >= 3) {
      const subdomain = parts[0];
      if (subdomain && !["www", "app", "admin", "api"].includes(subdomain)) {
        return subdomain;
      }
    }

    return null;
  }

  private static async findPartnerByHostname(
    hostname: string
  ): Promise<IPartner | null> {
    const Partner = Models.getPartner() as unknown as IPartnerModel;
    let partner = await Partner.findByCustomDomain(hostname);
    if (partner) {
      return partner;
    }

    const subdomain = MultiTenantMiddleware.extractSubdomain(hostname);
    if (subdomain) {
      partner = await Partner.findBySubdomain(subdomain);
      if (partner) {
        return partner;
      }
    }

    partner = await Partner.findByDomain(hostname);
    if (partner) {
      return partner;
    }

    return null;
  }

  static generateSubdomainUrl(
    subdomain: string,
    baseUrl: string = "http://127.0.0.1:3000"
  ): string {
    try {
      const url = new URL(baseUrl);
      const originalHostname = url.hostname;
      const port = url.port ? `:${url.port}` : "";
      const pathname = url.pathname;
      const search = url.search;
      const hash = url.hash;

      const newHostname = `${subdomain}.${originalHostname}`;

      return `${url.protocol}//${newHostname}${port}${pathname}${search}${hash}`;
    } catch (error) {
      if (baseUrl.includes("://")) {
        const [protocol, rest] = baseUrl.split("://");
        const parts = rest.split("/");
        const [host, ...pathParts] = parts;
        const [hostname, port] = host.includes(":")
          ? host.split(":")
          : [host, ""];
        const path = pathParts.length > 0 ? "/" + pathParts.join("/") : "";
        const newHost = port
          ? `${subdomain}.${hostname}:${port}`
          : `${subdomain}.${hostname}`;
        return `${protocol}://${newHost}${path}`;
      }
      return `${subdomain}.${baseUrl}`;
    }
  }

  static validateSubdomain(subdomain: string): {
    valid: boolean;
    error?: string;
  } {
    if (subdomain.length < 1 || subdomain.length > 63) {
      return { valid: false, error: "Subdomain must be 1-63 characters long" };
    }

    if (!/^[a-z0-9-]+$/.test(subdomain)) {
      return {
        valid: false,
        error:
          "Subdomain can only contain lowercase letters, numbers, and hyphens",
      };
    }

    const reserved = [
      "www",
      "app",
      "admin",
      "api",
      "ftp",
      "mail",
      "smtp",
      "pop",
      "imap",
    ];
    if (reserved.includes(subdomain.toLowerCase())) {
      return { valid: false, error: "Subdomain is a reserved word" };
    }

    if (subdomain.startsWith("-") || subdomain.endsWith("-")) {
      return {
        valid: false,
        error: "Subdomain cannot start or end with a hyphen",
      };
    }

    return { valid: true };
  }

  static validateCustomDomain(domain: string): {
    valid: boolean;
    error?: string;
  } {
    // Basic domain regex
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
      return { valid: false, error: "Invalid domain format" };
    }

    const mainDomains = [
      "pathosaathi.in",
      "app.pathosaathi.in",
      "admin.pathosaathi.in",
    ];
    if (mainDomains.includes(domain.toLowerCase())) {
      return { valid: false, error: "Cannot use platform domains" };
    }

    return { valid: true };
  }
}

export default MultiTenantMiddleware;
