import {
  FilterQuery,
  HydratedDocument,
  Model,
  PopulateOptions,
  Schema,
} from "mongoose";
import { env } from "@/config/env.config";

export interface PaginateOptions {
  page?: number;
  limit?: number;
  sort?: Record<string, 1 | -1> | string;
  select?: string | string[];
  populate?: PopulateOptions | PopulateOptions[] | string | string[];
  lean?: boolean;
}

export interface PaginationMeta {
  totalDocs: number;
  limit: number;
  page: number;
  totalPages: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  prevPage: number | null;
  nextPage: number | null;
}

export interface PaginateResult<T> {
  data: Array<HydratedDocument<T> | T>;
  pagination: PaginationMeta;
}

export interface PaginateModel<T extends Record<string, any>> extends Model<T> {
  paginate(
    filter: FilterQuery<T>,
    options?: PaginateOptions
  ): Promise<PaginateResult<T>>;
}

export const paginatePlugin = <T extends Record<string, any>>(
  schema: Schema<T>
): void => {
  schema.statics.paginate = async function (
    this: Model<T>,
    filter: FilterQuery<T> = {},
    options: PaginateOptions = {}
  ): Promise<PaginateResult<T>> {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Number(options.limit) || env.DEFAULT_LIMIT);
    const sort = options.sort || { createdAt: -1 };
    const select = options.select;
    const populate = options.populate;
    const lean = options.lean ?? false;

    const skip = (page - 1) * limit;

    const query = this.find(filter).sort(sort).skip(skip).limit(limit);

    if (select) {
      query.select(select as any);
    }

    if (populate) {
      query.populate(populate as any);
    }

    if (lean) {
      query.lean();
    }

    const results = await query.exec();
    const totalDocs = await this.countDocuments(filter);
    const data = results as Array<HydratedDocument<T> | T>;

    const totalPages = Math.max(1, Math.ceil(totalDocs / limit) || 1);
    const hasPrevPage = page > 1;
    const hasNextPage = page < totalPages;

    return {
      data,
      pagination: {
        totalDocs,
        limit,
        page,
        totalPages,
        hasPrevPage,
        hasNextPage,
        prevPage: hasPrevPage ? page - 1 : null,
        nextPage: hasNextPage ? page + 1 : null,
      },
    };
  };
};
