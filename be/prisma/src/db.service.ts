import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaClient, Prisma } from "@prisma/client";

@Injectable()
export class DbService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(DbService.name);

  constructor(private readonly configService: ConfigService) {
    const databaseUrl = configService.get<string>("DATABASE_URL");

    super({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
      log: ["query", "error", "warn"],
    });

    if (!databaseUrl) {
      this.logger.error("DATABASE_URL environment variable is not set");
    }
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log("Successfully connected to the database");
    } catch (error: unknown) {
      this.logger.error("Failed to connect to the database", error);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log("Successfully disconnected from the database");
  }

  // Swap CRUD operations
  async createSwap(data: Prisma.SwapCreateInput) {
    try {
      const swap = await this.swap.create({ data });
      return swap;
    } catch (error: unknown) {
      this.logger.error(`Error creating swap: ${(error as Error).message}`);
      throw error;
    }
  }

  async findSwapById(id: string) {
    try {
      const swap = await this.swap.findUnique({
        where: { id },
      });

      if (!swap) {
        throw new NotFoundException(`Swap with ID ${id} not found`);
      }

      return swap;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error finding swap by ID: ${(error as Error).message}`);
      throw error;
    }
  }

  async findSwaps(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.SwapWhereUniqueInput;
    where?: Prisma.SwapWhereInput;
    orderBy?: Prisma.SwapOrderByWithRelationInput;
  }) {
    try {
      const { skip, take, cursor, where, orderBy } = params;
      return await this.swap.findMany({
        skip,
        take,
        cursor,
        where,
        orderBy,
      });
    } catch (error: unknown) {
      this.logger.error(`Error finding swaps: ${(error as Error).message}`);
      throw error;
    }
  }

  async updateSwap(params: {
    where: Prisma.SwapWhereUniqueInput;
    data: Prisma.SwapUpdateInput;
  }) {
    try {
      const { where, data } = params;
      return await this.swap.update({
        where,
        data,
      });
    } catch (error: unknown) {
      this.logger.error(`Error updating swap: ${(error as Error).message}`);
      throw error;
    }
  }

  async deleteSwap(where: Prisma.SwapWhereUniqueInput) {
    try {
      return await this.swap.delete({ where });
    } catch (error: unknown) {
      this.logger.error(`Error deleting swap: ${(error as Error).message}`);
      throw error;
    }
  }

  // User CRUD operations
  async createUser(data: Prisma.UserCreateInput) {
    try {
      return await this.user.create({ data });
    } catch (error: unknown) {
      this.logger.error(`Error creating user: ${(error as Error).message}`);
      throw error;
    }
  }

  async findUserById(id: number) {
    try {
      const user = await this.user.findUnique({
        where: { id },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      return user;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error finding user by ID: ${(error as Error).message}`);
      throw error;
    }
  }

  async findUserByWalletAddress(walletAddress: string) {
    try {
      const user = await this.user.findUnique({
        where: { walletAddress },
      });

      if (!user) {
        throw new NotFoundException(`User with wallet address ${walletAddress} not found`);
      }

      return user;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error finding user by wallet address: ${(error as Error).message}`);
      throw error;
    }
  }

  async findUsers(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.UserWhereUniqueInput;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }) {
    try {
      const { skip, take, cursor, where, orderBy } = params;
      return await this.user.findMany({
        skip,
        take,
        cursor,
        where,
        orderBy,
      });
    } catch (error: unknown) {
      this.logger.error(`Error finding users: ${(error as Error).message}`);
      throw error;
    }
  }

  async updateUser(params: {
    where: Prisma.UserWhereUniqueInput;
    data: Prisma.UserUpdateInput;
  }) {
    try {
      const { where, data } = params;
      return await this.user.update({
        where,
        data,
      });
    } catch (error: unknown) {
      this.logger.error(`Error updating user: ${(error as Error).message}`);
      throw error;
    }
  }

  async deleteUser(where: Prisma.UserWhereUniqueInput) {
    try {
      return await this.user.delete({ where });
    } catch (error: unknown) {
      this.logger.error(`Error deleting user: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Get the Prisma client instance
   * @returns {PrismaClient}
   */
  getPrismaClient(): PrismaClient {
    return this;
  }
}
