import { MedusaError, MedusaService } from '@medusajs/framework/utils';
import AidPost, { type AidPostCategory, type AidPostStatus, type AidPostType, type AidPostUrgency } from '../models/aid-post';
import AidResponse from '../models/aid-response';

type Coordinates = { latitude: number; longitude: number };
type BBox = { west: number; south: number; east: number; north: number };

type CreatePostInput = {
    customer_id: string;
    type: AidPostType;
    category: AidPostCategory;
    title: string;
    description: string;
    location: Coordinates;
    display_radius?: number;
    urgency?: AidPostUrgency;
    expires_at?: string | Date | null;
    metadata?: Record<string, unknown> | null;
};

type RespondToPostInput = {
    aid_post_id: string;
    responder_id: string;
    message: string;
};

type NearbyFilters = {
    type?: AidPostType;
    category?: AidPostCategory;
    urgency?: AidPostUrgency;
    status?: AidPostStatus;
};

class MutualAidModuleService extends MedusaService({ AidPost, AidResponse }) {
    async createPost(input: CreatePostInput) {
        const post = await this.createAidPosts({
            ...input,
            location: input.location,
            display_radius: input.display_radius ?? 400,
            urgency: input.urgency ?? 'medium',
            expires_at: input.expires_at ?? null,
            status: 'open',
            fulfiller_id: null,
            fulfilled_at: null,
            metadata: input.metadata ?? null,
        });

        await this.persistPoint(post.id, input.location.longitude, input.location.latitude);
        return post;
    }

    async respondToPost(input: RespondToPostInput) {
        const [post] = await this.listAidPosts({ id: input.aid_post_id }, { take: 1 });
        if (!post) {
            throw new MedusaError(MedusaError.Types.NOT_FOUND, `AidPost ${input.aid_post_id} not found`);
        }

        if (post.status !== 'open' && post.status !== 'in_progress') {
            throw new MedusaError(MedusaError.Types.INVALID_DATA, `AidPost ${input.aid_post_id} is not open for responses`);
        }

        const matrix_room_id = await this.createMatrixCoordinationRoom(post.customer_id, input.responder_id, post.id);

        const response = await this.createAidResponses({
            aid_post_id: input.aid_post_id,
            responder_id: input.responder_id,
            message: input.message,
            status: 'pending',
            matrix_room_id,
        });

        return response;
    }

    async fulfillPost(aidPostId: string, fulfillerId: string) {
        const [post] = await this.listAidPosts({ id: aidPostId }, { take: 1 });
        if (!post) {
            throw new MedusaError(MedusaError.Types.NOT_FOUND, `AidPost ${aidPostId} not found`);
        }

        if (post.status === 'fulfilled') {
            return post;
        }

        return this.updateAidPosts({
            id: aidPostId,
            status: 'fulfilled',
            fulfiller_id: fulfillerId,
            fulfilled_at: new Date(),
        });
    }

    async getNearbyPosts(latitude: number, longitude: number, radiusKm: number, filters: NearbyFilters = {}) {
        const manager = this.__container__.resolve('manager');
        const params: any[] = [longitude, latitude, Math.max(radiusKm, 0) * 1000];

        const where: string[] = [
            `status IN ('open', 'in_progress')`,
            `location IS NOT NULL`,
            `ST_DWithin(location::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)`,
            `(expires_at IS NULL OR expires_at > now())`,
        ];

        if (filters.type) {
            params.push(filters.type);
            where.push(`type = $${params.length}`);
        }
        if (filters.category) {
            params.push(filters.category);
            where.push(`category = $${params.length}`);
        }
        if (filters.urgency) {
            params.push(filters.urgency);
            where.push(`urgency = $${params.length}`);
        }
        if (filters.status) {
            params.push(filters.status);
            where.push(`status = $${params.length}`);
        }

        const rows = await manager.query(
            `
            SELECT
              id,
              customer_id,
              type,
              category,
              title,
              description,
              ST_X(location::geometry) AS longitude,
              ST_Y(location::geometry) AS latitude,
              display_radius,
              urgency,
              expires_at,
              status,
              fulfiller_id,
              fulfilled_at,
              metadata,
              created_at,
              updated_at,
              ST_Distance(location::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) AS distance_meters
            FROM aid_post
            WHERE ${where.join(' AND ')}
            ORDER BY distance_meters ASC
            LIMIT 200
            `,
            params
        );

        return rows.map((row: any) => {
            const fuzzed = this.fuzzCoordinates(
                { latitude: Number(row.latitude), longitude: Number(row.longitude) },
                Number(row.display_radius ?? 0)
            );

            return {
                ...row,
                location: fuzzed,
                distance_meters: Number(row.distance_meters),
            };
        });
    }

    async listByBBox(bbox: BBox, filters: NearbyFilters = {}) {
        const manager = this.__container__.resolve('manager');
        const params: any[] = [bbox.west, bbox.south, bbox.east, bbox.north];

        const where = [
            `location IS NOT NULL`,
            `ST_Within(location, ST_MakeEnvelope($1, $2, $3, $4, 4326))`,
            `(expires_at IS NULL OR expires_at > now())`,
        ];

        if (filters.type) {
            params.push(filters.type);
            where.push(`type = $${params.length}`);
        }
        if (filters.category) {
            params.push(filters.category);
            where.push(`category = $${params.length}`);
        }
        if (filters.urgency) {
            params.push(filters.urgency);
            where.push(`urgency = $${params.length}`);
        }
        if (filters.status) {
            params.push(filters.status);
            where.push(`status = $${params.length}`);
        }

        const rows = await manager.query(
            `
            SELECT
              id,
              customer_id,
              type,
              category,
              title,
              description,
              ST_X(location::geometry) AS longitude,
              ST_Y(location::geometry) AS latitude,
              display_radius,
              urgency,
              expires_at,
              status,
              fulfiller_id,
              fulfilled_at,
              metadata,
              created_at,
              updated_at
            FROM aid_post
            WHERE ${where.join(' AND ')}
            ORDER BY created_at DESC
            LIMIT 200
            `,
            params
        );

        return rows.map((row: any) => ({
            ...row,
            location: this.fuzzCoordinates(
                { latitude: Number(row.latitude), longitude: Number(row.longitude) },
                Number(row.display_radius ?? 0)
            ),
        }));
    }

    async matchNeeds(userId: string, latitude: number, longitude: number, radiusKm: number, categories?: AidPostCategory[]) {
        const manager = this.__container__.resolve('manager');
        const params: any[] = [userId, longitude, latitude, Math.max(radiusKm, 0) * 1000];

        let categoryClause = '';
        if (categories?.length) {
            params.push(categories);
            categoryClause = `AND needs.category = ANY($${params.length})`;
        }

        const rows = await manager.query(
            `
            SELECT
                needs.id,
                needs.customer_id,
                needs.category,
                needs.title,
                needs.description,
                ST_X(needs.location::geometry) AS longitude,
                ST_Y(needs.location::geometry) AS latitude,
                needs.display_radius,
                needs.urgency,
                ST_Distance(needs.location::geography, offers.location::geography) AS distance_meters
            FROM aid_post offers
            INNER JOIN aid_post needs ON needs.type = 'need'
            WHERE offers.customer_id = $1
              AND offers.type = 'offer'
              AND offers.status IN ('open', 'in_progress')
              AND needs.status IN ('open', 'in_progress')
              AND needs.fulfiller_id IS NULL
              AND offers.category = needs.category
              AND offers.location IS NOT NULL
              AND needs.location IS NOT NULL
              AND ST_DWithin(needs.location::geography, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography, $4)
              AND ST_DWithin(needs.location::geography, offers.location::geography, $4)
              ${categoryClause}
            ORDER BY distance_meters ASC
            LIMIT 200
            `,
            params
        );

        return rows.map((row: any) => ({
            ...row,
            location: this.fuzzCoordinates({ latitude: Number(row.latitude), longitude: Number(row.longitude) }, Number(row.display_radius ?? 0)),
            distance_meters: Number(row.distance_meters),
        }));
    }

    private async createMatrixCoordinationRoom(posterId: string, responderId: string, aidPostId: string): Promise<string | null> {
        const gatewayHost = process.env.BLACKSTAR_GATEWAY_HOST;
        if (!gatewayHost) {
            return null;
        }

        try {
            const response = await fetch(`${gatewayHost.replace(/\/$/, '')}/api/v1/provider-profile`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({
                    mode: 'coordination_dm',
                    aid_post_id: aidPostId,
                    poster_id: posterId,
                    responder_id: responderId,
                }),
            });

            if (!response.ok) {
                return null;
            }

            const payload = await response.json();
            return payload?.matrix_room_id ?? payload?.room_id ?? null;
        } catch {
            return null;
        }
    }

    private async persistPoint(id: string, longitude: number, latitude: number) {
        const manager = this.__container__.resolve('manager');
        await manager.query(
            `
            UPDATE aid_post
            SET location = ST_SetSRID(ST_MakePoint($1, $2), 4326)
            WHERE id = $3
            `,
            [longitude, latitude, id]
        );
    }

    private fuzzCoordinates(coordinates: Coordinates, displayRadiusMeters: number): Coordinates {
        if (!Number.isFinite(displayRadiusMeters) || displayRadiusMeters <= 0) {
            return coordinates;
        }

        const randomDistance = Math.random() * displayRadiusMeters;
        const randomBearing = Math.random() * Math.PI * 2;
        const deltaLat = (randomDistance * Math.cos(randomBearing)) / 111_320;
        const deltaLng = (randomDistance * Math.sin(randomBearing)) / (111_320 * Math.max(Math.cos((coordinates.latitude * Math.PI) / 180), 0.01));

        return {
            latitude: coordinates.latitude + deltaLat,
            longitude: coordinates.longitude + deltaLng,
        };
    }
}

export default MutualAidModuleService;
export type { CreatePostInput, RespondToPostInput, NearbyFilters, Coordinates, BBox };
