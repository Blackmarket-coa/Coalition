import { MedusaError, MedusaService } from '@medusajs/framework/utils';
import SellerLocation, { type LocationType } from '../models/seller-location';

type UpsertSellerLocationInput = {
    seller_id: string;
    latitude: number;
    longitude: number;
    address_line: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    display_radius: number;
    is_visible: boolean;
    location_type: LocationType;
};

type BBox = {
    west: number;
    south: number;
    east: number;
    north: number;
};

type PublicLocationDTO = {
    id: string;
    seller_id: string;
    coordinates: { longitude: number; latitude: number };
    address_line: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    display_radius: number;
    location_type: LocationType;
};

class SellerLocationModuleService extends MedusaService({ SellerLocation }) {
    async upsertForSeller(input: UpsertSellerLocationInput) {
        const [existing] = await this.listSellerLocations({ seller_id: input.seller_id }, { take: 1 });

        if (existing) {
            const updated = await this.updateSellerLocations({ id: existing.id, ...input });
            await this.persistPointGeometry(updated.id, input.longitude, input.latitude);
            return updated;
        }

        const created = await this.createSellerLocations(input);
        await this.persistPointGeometry(created.id, input.longitude, input.latitude);
        return created;
    }

    async deleteForSeller(sellerId: string) {
        const [existing] = await this.listSellerLocations({ seller_id: sellerId }, { take: 1 });
        if (!existing) {
            return { deleted: false };
        }

        await this.deleteSellerLocations(existing.id);
        return { deleted: true };
    }

    async listPublicByBBox(bbox: BBox): Promise<PublicLocationDTO[]> {
        const manager = this.__container__.resolve('manager');

        const rows = await manager.query(
            `
        SELECT
          id,
          seller_id,
          longitude,
          latitude,
          address_line,
          city,
          state,
          zip,
          country,
          display_radius,
          location_type
        FROM seller_location
        WHERE is_visible = true
          AND coordinates IS NOT NULL
          AND ST_Within(coordinates, ST_MakeEnvelope(?, ?, ?, ?, 4326))
      `,
            [bbox.west, bbox.south, bbox.east, bbox.north]
        );

        return rows.map((row: any) => {
            const fuzzed = this.fuzzCoordinates({ longitude: Number(row.longitude), latitude: Number(row.latitude) }, Number(row.display_radius));

            return {
                id: row.id,
                seller_id: row.seller_id,
                coordinates: fuzzed,
                address_line: row.address_line,
                city: row.city,
                state: row.state,
                zip: row.zip,
                country: row.country,
                display_radius: Number(row.display_radius),
                location_type: row.location_type,
            } satisfies PublicLocationDTO;
        });
    }

    private async persistPointGeometry(id: string, longitude: number, latitude: number) {
        const manager = this.__container__.resolve('manager');

        await manager.query(
            `
        UPDATE seller_location
        SET
          longitude = ?,
          latitude = ?,
          coordinates = ST_SetSRID(ST_MakePoint(?, ?), 4326)
        WHERE id = ?
      `,
            [longitude, latitude, longitude, latitude, id]
        );
    }

    private fuzzCoordinates(coordinates: { longitude: number; latitude: number }, displayRadiusMeters: number) {
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

    async assertSellerOwnershipOrThrow(contextSellerId: string | undefined) {
        if (!contextSellerId) {
            throw new MedusaError(MedusaError.Types.UNAUTHORIZED, 'Vendor context does not include seller_id');
        }

        return contextSellerId;
    }
}

export default SellerLocationModuleService;
export type { UpsertSellerLocationInput, PublicLocationDTO, BBox };
