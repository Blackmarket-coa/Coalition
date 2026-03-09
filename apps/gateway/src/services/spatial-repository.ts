import { Pool } from 'pg';
import type { BBox, EntityType, SellerLocationRow } from '../lib/types';

export class SpatialRepository {
    constructor(private readonly pool: Pool) {}

    async getLocationsInBbox(entityTypes: EntityType[], bbox: BBox, limit: number, offset: number): Promise<SellerLocationRow[]> {
        const sql = `
            SELECT
                sl.entity_type,
                sl.entity_id::text,
                ST_X(sl.geom::geometry) AS longitude,
                ST_Y(sl.geom::geometry) AS latitude
            FROM seller_location sl
            WHERE sl.entity_type = ANY($1::text[])
              AND ST_Within(
                sl.geom,
                ST_MakeEnvelope($2, $3, $4, $5, 4326)
              )
            ORDER BY sl.entity_type, sl.entity_id
            LIMIT $6 OFFSET $7
        `;

        const result = await this.pool.query<SellerLocationRow>(sql, [entityTypes, bbox.west, bbox.south, bbox.east, bbox.north, limit, offset]);
        return result.rows;
    }
}
