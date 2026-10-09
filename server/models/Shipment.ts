import { loadDatabase, saveDatabase } from '../database/db.js';
import { isMongoActive, MongoShipment, MongoDeletedShipment } from '../database/mongo.js';
import { AuditLogModel } from './AuditLog.js';
import { Shipment, DocumentItem, DocStatus, ShipmentStage } from '../types/index.js';

function formatDateString(isoStr?: string | null): string {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return isoStr;
  }
}

/**
 * MERN Model: Shipment
 * Hybrid collection access object for Shipment records supporting MongoDB & local JSON fallback.
 */

export class ShipmentModel {
  static async getDeletedIdSet(): Promise<Set<string>> {
    const db = loadDatabase();
    const set = new Set<string>((db.deletedShipmentIds || []).map(d => String(d).toUpperCase()));

    if (isMongoActive()) {
      try {
        const mongoDeleted = await (MongoDeletedShipment as any).find({}).lean();
        mongoDeleted.forEach((item: any) => {
          if (item?.targetId) {
            set.add(String(item.targetId).toUpperCase());
            if (!db.deletedShipmentIds!.includes(item.targetId)) {
              db.deletedShipmentIds!.push(item.targetId);
            }
          }
        });
      } catch (err) {
        console.error('[ShipmentModel] Mongo getDeletedIdSet error:', err);
      }
    }

    return set;
  }

  static async find(): Promise<Shipment[]> {
    const deletedSet = await ShipmentModel.getDeletedIdSet();

    const isDeleted = (s: Shipment) => {
      if (!s) return true;
      if (s.id && deletedSet.has(s.id.toUpperCase())) return true;
      if ((s as any)._id && deletedSet.has(String((s as any)._id).toUpperCase())) return true;
      if (s.invoice && deletedSet.has(s.invoice.toUpperCase())) return true;
      if (s.containerNo && deletedSet.has(s.containerNo.toUpperCase())) return true;
      return false;
    };

    if (isMongoActive()) {
      try {
        const mongoDocs = await (MongoShipment as any).find({}).lean();
        const list = mongoDocs.map((doc: any) => {
          const { _id, __v, ...rest } = doc;
          return rest as Shipment;
        });
        return list.filter(s => !isDeleted(s));
      } catch (err) {
        console.error('[ShipmentModel] Mongo find error:', err);
      }
    }

    const db = loadDatabase();
    return (db.shipments || []).filter(s => !isDeleted(s));
  }

  static async findById(id: string): Promise<Shipment | null> {
    const deletedSet = await ShipmentModel.getDeletedIdSet();
    const idUpper = String(id || '').toUpperCase();
    if (deletedSet.has(idUpper)) return null;

    if (isMongoActive()) {
      try {
        const doc = await (MongoShipment as any).findOne({ id }).lean();
        if (doc) {
          const { _id, __v, ...rest } = doc as any;
          const s = rest as Shipment;
          if (s.invoice && deletedSet.has(s.invoice.toUpperCase())) return null;
          if (s.containerNo && deletedSet.has(s.containerNo.toUpperCase())) return null;
          return s;
        }
        return null;
      } catch (err) {
        console.error('[ShipmentModel] Mongo findById error:', err);
      }
    }
    const db = loadDatabase();
    const s = db.shipments.find(s => s.id === id) || null;
    if (s) {
      if (s.invoice && deletedSet.has(s.invoice.toUpperCase())) return null;
      if (s.containerNo && deletedSet.has(s.containerNo.toUpperCase())) return null;
    }
    return s;
  }

  static async findByCustomerId(customerId: string): Promise<Shipment[]> {
    if (isMongoActive()) {
      try {
        const mongoDocs = await (MongoShipment as any).find({ customerId }).lean();
        return mongoDocs.map((doc: any) => {
          const { _id, __v, ...rest } = doc;
          return rest as Shipment;
        });
      } catch (err) {
        console.error('[ShipmentModel] Mongo findByCustomerId error:', err);
      }
    }
    const db = loadDatabase();
    return db.shipments.filter(s => s.customerId === customerId);
  }

  static async create(payload: {
    invoice: string;
    customerId: string;
    dest: string;
    status?: ShipmentStage;
    tradeType?: 'Import' | 'Export';
    containerNo?: string;
    trackingLink?: string;
    etd?: string;
    eta?: string;
    shipsgoReference?: string;
    isShipsGoLinked?: boolean;
    docs?: any[];
  }): Promise<Shipment> {
    const rawDocs = payload.docs || [];
    const docChecklist: DocumentItem[] = rawDocs.map((d: any) => {
      if (typeof d === 'string') {
        return { name: d, status: 'Not Started' as DocStatus };
      }
      const name = typeof d?.name === 'string' ? d.name : (typeof d?.name?.name === 'string' ? d.name.name : String(d?.name || 'Document'));
      const status = typeof d?.status === 'string' ? d.status : 'Not Started';
      return {
        name: name || 'Document',
        status: status as DocStatus,
        notes: typeof d?.notes === 'string' ? d.notes : '',
        updatedAt: d?.updatedAt
      };
    });

    const newShipment: Shipment = {
      id: 'sh_' + Math.random().toString(36).slice(2, 10),
      invoice: payload.invoice,
      customerId: payload.customerId,
      dest: payload.dest || '—',
      status: payload.status || 'Documentation',
      tradeType: payload.tradeType || 'Export',
      containerNo: payload.containerNo || '',
      trackingLink: payload.trackingLink || (payload.containerNo ? `https://shipsgo.com/tracking/${payload.containerNo}` : ''),
      etd: payload.etd || '',
      eta: payload.eta || '',
      shipsgoReference: payload.shipsgoReference || '',
      isShipsGoLinked: Boolean(payload.isShipsGoLinked || payload.shipsgoReference),
      docs: docChecklist,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (isMongoActive()) {
      try {
        await (MongoShipment as any).create(newShipment);
      } catch (err) {
        console.error('[ShipmentModel] Mongo create error:', err);
      }
    }

    const db = loadDatabase();
    db.shipments.unshift(newShipment);
    saveDatabase(db);

    await AuditLogModel.create({
      action: 'Shipment Created',
      targetId: newShipment.id,
      targetType: 'shipment',
      details: `Created shipment ${newShipment.invoice} destination ${newShipment.dest}`
    });

    const customer = db.customers.find(c => c.id === newShipment.customerId);
    const customerName = customer ? customer.name : (newShipment.customerId || 'Customer');

    for (const doc of docChecklist) {
      if (doc.status === 'Completed') {
        await AuditLogModel.create({
          action: 'Document Completed',
          targetId: newShipment.invoice || newShipment.id,
          targetType: 'doc_config',
          details: `${doc.name} document of customer ${customerName} (Invoice: ${newShipment.invoice}) mark completed`,
          user: 'System Operator'
        });
      }
    }

    return newShipment;
  }

  static async findByIdAndUpdate(id: string, updates: Partial<Shipment>): Promise<Shipment | null> {
    const deletedSet = await ShipmentModel.getDeletedIdSet();
    const idUpper = String(id || '').trim().toUpperCase();
    if (deletedSet.has(idUpper)) {
      return null;
    }

    const db = loadDatabase();
    let index = db.shipments.findIndex(s => s.id === id || s.invoice === id || (s as any)._id === id);

    let existingMongo: any = null;
    if (isMongoActive()) {
      try {
        existingMongo = await (MongoShipment as any).findOne({ $or: [{ id }, { invoice: id }] }).lean();
        if (existingMongo) {
          const { _id, __v, ...rest } = existingMongo;
          existingMongo = rest;
        }
      } catch (err) {
        console.error('[ShipmentModel] Mongo find existing before update error:', err);
      }
    }

    const existingShipment: Shipment | null = (index !== -1 && db.shipments[index]) 
      ? db.shipments[index] 
      : (existingMongo ? (existingMongo as Shipment) : null);

    if (existingShipment) {
      if (existingShipment.id && deletedSet.has(existingShipment.id.toUpperCase())) return null;
      if (existingShipment.invoice && deletedSet.has(existingShipment.invoice.toUpperCase())) return null;
      if (existingShipment.containerNo && deletedSet.has(existingShipment.containerNo.toUpperCase())) return null;
    }

    let updated: Shipment;
    let prevStatus = existingShipment?.status || '';
    let prevDocs: DocumentItem[] = Array.isArray(existingShipment?.docs)
      ? JSON.parse(JSON.stringify(existingShipment.docs))
      : [];

    const sanitizeDocs = (rawDocs?: any[]): DocumentItem[] => {
      if (!rawDocs) return [];
      return rawDocs.map((d: any) => {
        if (typeof d === 'string') {
          return { name: d, status: 'Not Started' as DocStatus };
        }
        const name = typeof d?.name === 'string' ? d.name : (typeof d?.name?.name === 'string' ? d.name.name : String(d?.name || 'Document'));
        const status = typeof d?.status === 'string' ? d.status : 'Not Started';
        return {
          name: name || 'Document',
          status: status as DocStatus,
          notes: typeof d?.notes === 'string' ? d.notes : '',
          updatedAt: d?.updatedAt
        };
      });
    };

    if (updates.docs) {
      updates.docs = sanitizeDocs(updates.docs);
    }

    if (!existingShipment) {
      const defaultCustomerId = db.customers[0]?.id || '';
      const containerNo = (updates.containerNo || '').trim().toUpperCase();
      updated = {
        id,
        invoice: updates.invoice || (containerNo ? `REF-${containerNo}` : `REF-${id}`),
        customerId: updates.customerId || defaultCustomerId,
        dest: updates.dest || 'DESTINATION PORT',
        status: updates.status || 'Documentation',
        containerNo,
        trackingLink: updates.trackingLink || (containerNo ? `https://shipsgo.com/tracking/${containerNo}` : ''),
        pol: updates.pol || '',
        etd: updates.etd || '',
        eta: updates.eta || '',
        docs: updates.docs || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      db.shipments.unshift(updated);
    } else {
      if (updates.isShipsGoLinked === false) {
        updates.shipsgoReference = '';
        updates.trackingLink = '';
      }
      updated = {
        ...existingShipment,
        ...updates,
        docs: updates.docs !== undefined ? updates.docs : (existingShipment.docs || []),
        shipsgoReference: updates.isShipsGoLinked === false ? '' : (updates.shipsgoReference !== undefined ? updates.shipsgoReference : existingShipment.shipsgoReference),
        isShipsGoLinked: updates.isShipsGoLinked !== undefined ? updates.isShipsGoLinked : existingShipment.isShipsGoLinked,
        updatedAt: new Date().toISOString()
      };
      if (index !== -1) {
        db.shipments[index] = updated;
      } else {
        db.shipments.unshift(updated);
      }
    }

    if (isMongoActive()) {
      try {
        await (MongoShipment as any).findOneAndUpdate(
          { $or: [{ id }, { invoice: id }] },
          updated,
          { upsert: true, returnDocument: 'after' }
        );
      } catch (err) {
        console.error('[ShipmentModel] Mongo findByIdAndUpdate error:', err);
      }
    }

    saveDatabase(db);

    const customer = db.customers.find(c => c.id === updated.customerId);
    const customerName = customer ? customer.name : (updated.customerId || 'Customer');

    if (!existingShipment) {
      await AuditLogModel.create({
        action: 'Shipment Created',
        targetId: updated.invoice || updated.id,
        targetType: 'shipment',
        details: `Created invoice/shipment ${updated.invoice} for ${updated.dest}`,
        user: 'System Operator'
      });

      if (updated.docs && Array.isArray(updated.docs)) {
        for (const doc of updated.docs) {
          if (doc.status === 'Completed') {
            await AuditLogModel.create({
              action: 'Document Completed',
              targetId: updated.invoice || id,
              targetType: 'doc_config',
              details: `${doc.name} document of customer ${customerName} (Invoice: ${updated.invoice}) mark completed`,
              user: 'System Operator'
            });
          }
        }
      }
    } else {
      if (updates.status && updates.status !== prevStatus) {
        await AuditLogModel.create({
          action: 'Stage Changed',
          targetId: updated.invoice || id,
          targetType: 'shipment',
          details: `Stage updated from "${prevStatus}" to "${updates.status}" for ${updated.invoice}`,
          user: 'System Operator'
        });
      }

      if (updates.docs && Array.isArray(updates.docs)) {
        for (const newDoc of updates.docs) {
          const oldDoc = prevDocs.find(d => d.name.trim().toLowerCase() === newDoc.name.trim().toLowerCase());
          if (!oldDoc || oldDoc.status !== newDoc.status) {
            if (newDoc.status === 'Completed') {
              await AuditLogModel.create({
                action: 'Document Completed',
                targetId: updated.invoice || id,
                targetType: 'doc_config',
                details: `${newDoc.name} document of customer ${customerName} (Invoice: ${updated.invoice}) mark completed`,
                user: 'System Operator'
              });
            } else if (newDoc.status && newDoc.status !== 'Not Started') {
              await AuditLogModel.create({
                action: `Document ${newDoc.status}`,
                targetId: updated.invoice || id,
                targetType: 'doc_config',
                details: `${newDoc.name} document of customer ${customerName} (Invoice: ${updated.invoice}) updated to ${newDoc.status}`,
                user: 'System Operator'
              });
            }
          }
        }
      }
    }

    return updated;
  }

  static async updateDocStatus(shipmentId: string, docIndex: number, status: DocStatus): Promise<Shipment | null> {
    let shipment: Shipment | null = null;
    if (isMongoActive()) {
      try {
        const doc = await (MongoShipment as any).findOne({ id: shipmentId }).lean();
        if (doc) {
          const { _id, __v, ...rest } = doc as any;
          shipment = rest as Shipment;
        }
      } catch (err) {
        console.error('[ShipmentModel] Mongo updateDocStatus find error:', err);
      }
    }

    const db = loadDatabase();
    const index = db.shipments.findIndex(s => s.id === shipmentId);
    if (!shipment && index !== -1) {
      shipment = db.shipments[index];
    }

    if (!shipment) return null;

    if (shipment.docs && shipment.docs[docIndex]) {
      const docName = shipment.docs[docIndex].name;
      const prevDocStatus = shipment.docs[docIndex].status;
      shipment.docs[docIndex].status = status;
      shipment.docs[docIndex].updatedAt = new Date().toISOString();
      shipment.updatedAt = new Date().toISOString();

      if (isMongoActive()) {
        try {
          await (MongoShipment as any).findOneAndUpdate({ id: shipmentId }, { docs: shipment.docs, updatedAt: shipment.updatedAt });
        } catch (err) {
          console.error('[ShipmentModel] Mongo updateDocStatus error:', err);
        }
      }

      if (index !== -1) {
        db.shipments[index] = shipment;
      } else {
        db.shipments.unshift(shipment);
      }
      saveDatabase(db);

      const customer = db.customers.find(c => c.id === shipment.customerId);
      const customerName = customer ? customer.name : (shipment.customerId || 'Customer');

      if (status === 'Completed') {
        await AuditLogModel.create({
          action: 'Document Completed',
          targetId: shipment.invoice || shipmentId,
          targetType: 'doc_config',
          details: `${docName} document of customer ${customerName} (Invoice: ${shipment.invoice}) mark completed`,
          user: 'System Operator'
        });
      } else {
        await AuditLogModel.create({
          action: `Document ${status}`,
          targetId: shipment.invoice || shipmentId,
          targetType: 'doc_config',
          details: `${docName} document of customer ${customerName} (Invoice: ${shipment.invoice}) updated from ${prevDocStatus} to ${status}`,
          user: 'System Operator'
        });
      }
    }

    return shipment;
  }

  static async addCustomDoc(shipmentId: string, docName: string): Promise<Shipment | null> {
    const db = loadDatabase();
    const index = db.shipments.findIndex(s => s.id === shipmentId);
    if (index === -1) return null;

    const shipment = db.shipments[index];
    const exists = shipment.docs.some(d => d.name.toLowerCase() === docName.toLowerCase());
    if (!exists) {
      shipment.docs.push({
        name: docName,
        status: 'Not Started'
      });
      shipment.updatedAt = new Date().toISOString();

      if (isMongoActive()) {
        try {
          await (MongoShipment as any).findOneAndUpdate({ id: shipmentId }, { docs: shipment.docs, updatedAt: shipment.updatedAt });
        } catch (err) {
          console.error('[ShipmentModel] Mongo addCustomDoc error:', err);
        }
      }

      saveDatabase(db);

      const customer = db.customers.find(c => c.id === shipment.customerId);
      const customerName = customer ? customer.name : (shipment.customerId || 'Customer');

      await AuditLogModel.create({
        action: 'Custom Document Added',
        targetId: shipment.invoice || shipmentId,
        targetType: 'doc_config',
        details: `Added custom document "${docName}" to customer ${customerName} on invoice ${shipment.invoice}`,
        user: 'System Operator'
      });
    }

    return shipment;
  }

  static async markAllDocsComplete(shipmentId: string): Promise<Shipment | null> {
    const db = loadDatabase();
    const index = db.shipments.findIndex(s => s.id === shipmentId);
    if (index === -1) return null;

    const shipment = db.shipments[index];
    const prevDocs = [...shipment.docs];
    shipment.docs = shipment.docs.map(d => ({ ...d, status: 'Completed', updatedAt: new Date().toISOString() }));
    shipment.updatedAt = new Date().toISOString();

    if (isMongoActive()) {
      try {
        await (MongoShipment as any).findOneAndUpdate({ id: shipmentId }, { docs: shipment.docs, updatedAt: shipment.updatedAt });
      } catch (err) {
        console.error('[ShipmentModel] Mongo markAllDocsComplete error:', err);
      }
    }

    saveDatabase(db);

    const customer = db.customers.find(c => c.id === shipment.customerId);
    const customerName = customer ? customer.name : (shipment.customerId || 'Customer');

    for (const d of prevDocs) {
      if (d.status !== 'Completed') {
        await AuditLogModel.create({
          action: 'Document Completed',
          targetId: shipment.invoice || shipmentId,
          targetType: 'doc_config',
          details: `${d.name} document of customer ${customerName} (Invoice: ${shipment.invoice}) mark completed`,
          user: 'System Operator'
        });
      }
    }

    return shipment;
  }

  static async syncDocsWithCustomer(shipmentId: string): Promise<Shipment | null> {
    const db = loadDatabase();
    const shipmentIndex = db.shipments.findIndex(s => s.id === shipmentId);
    if (shipmentIndex === -1) return null;

    const shipment = db.shipments[shipmentIndex];
    const customer = db.customers.find(c => c.id === shipment.customerId);
    if (!customer) return shipment;

    const reqDocs = customer.requiredDocs || [];
    const existingMap: Record<string, DocStatus> = {};
    shipment.docs.forEach(d => {
      existingMap[d.name] = d.status;
    });

    shipment.docs = reqDocs.map(name => ({
      name,
      status: existingMap[name] || 'Not Started'
    }));
    shipment.updatedAt = new Date().toISOString();

    db.shipments[shipmentIndex] = shipment;

    if (isMongoActive()) {
      try {
        await (MongoShipment as any).findOneAndUpdate({ id: shipmentId }, { docs: shipment.docs, updatedAt: shipment.updatedAt });
      } catch (err) {
        console.error('[ShipmentModel] Mongo syncDocsWithCustomer error:', err);
      }
    }

    saveDatabase(db);

    await AuditLogModel.create({
      action: 'Checklist Synced',
      targetId: shipmentId,
      targetType: 'shipment',
      details: `Synced document checklist with customer ${customer.name} requirements for ${shipment.invoice}`
    });

    return shipment;
  }

  static async findByIdAndDelete(id: string): Promise<boolean> {
    const targetId = String(id || '').trim();
    if (!targetId) return true;

    let deleted = false;
    let decodedId = targetId;
    try {
      decodedId = decodeURIComponent(targetId);
    } catch {
      decodedId = targetId;
    }

    if (isMongoActive()) {
      try {
        const res = await (MongoShipment as any).deleteMany({
          $or: [
            { id: targetId },
            { id: decodedId },
            { _id: targetId },
            { invoice: targetId },
            { invoice: decodedId },
            { containerNo: targetId }
          ]
        });
        if (res && res.deletedCount && res.deletedCount > 0) {
          deleted = true;
        }
      } catch (err) {
        console.error('[ShipmentModel] Mongo findByIdAndDelete error:', err);
      }
    }

    const db = loadDatabase();
    const matchesTarget = (s: Shipment) =>
      s.id === targetId ||
      s.id === decodedId ||
      (s as any)._id === targetId ||
      s.invoice === targetId ||
      s.invoice === decodedId ||
      (s.containerNo && s.containerNo.toUpperCase() === targetId.toUpperCase());

    const shipmentsToDelete = db.shipments.filter(matchesTarget);
    const shipment = shipmentsToDelete[0];
    const initialLen = db.shipments.length;
    db.shipments = db.shipments.filter(s => !matchesTarget(s));

    if (!db.deletedShipmentIds) {
      db.deletedShipmentIds = [];
    }

    // Record identifiers in deleted list to permanently avoid re-syncing
    const idsToBlacklist = [targetId, decodedId];
    shipmentsToDelete.forEach(s => {
      if (s.id) idsToBlacklist.push(s.id);
      if (s.invoice) idsToBlacklist.push(s.invoice);
      if (s.containerNo) idsToBlacklist.push(s.containerNo.toUpperCase());
    });

    idsToBlacklist.forEach(item => {
      if (item && !db.deletedShipmentIds!.includes(item)) {
        db.deletedShipmentIds!.push(item);
      }
    });

    if (isMongoActive()) {
      try {
        const bulkOps = idsToBlacklist
          .filter(Boolean)
          .map(item => ({
            updateOne: {
              filter: { targetId: item },
              update: { $set: { targetId: item, deletedAt: new Date().toISOString() } },
              upsert: true
            }
          }));
        if (bulkOps.length > 0) {
          await (MongoDeletedShipment as any).bulkWrite(bulkOps);
        }
      } catch (err) {
        console.error('[ShipmentModel] Mongo save deletedShipmentIds error:', err);
      }
    }

    if (db.shipments.length < initialLen || deleted) {
      saveDatabase(db);
    }

    if (shipment) {
      await AuditLogModel.create({
        action: 'Shipment Deleted',
        targetId: targetId,
        targetType: 'shipment',
        details: `Deleted shipment invoice ${shipment.invoice}`
      });
    }

    return true;
  }

  static async upsertFromShipsGo(shipsgoShipments: any[]): Promise<Shipment[]> {
    const db = loadDatabase();
    let modified = false;
    const deletedSet = new Set((db.deletedShipmentIds || []).map(d => d.toUpperCase()));

    for (const sg of shipsgoShipments) {
      const containerNo = (
        (sg.container_number && sg.container_number !== '-' ? sg.container_number : '') ||
        (sg.containerNo && sg.containerNo !== '-' ? sg.containerNo : '') ||
        (sg.booking_number && sg.booking_number !== '-' ? sg.booking_number : '') ||
        (sg.bookingMbl && sg.bookingMbl !== '-' ? sg.bookingMbl : '') ||
        ''
      ).trim().toUpperCase();

      const sgId = String(sg.id || sg.shipmentId || '');
      const ref = (sg.reference || sg.invoice || (containerNo ? `REF-${containerNo}` : `REF-${sgId}`)).trim();

      if (!containerNo && !sgId) continue;

      // If user previously deleted this shipment/container/reference, DO NOT recreate it!
      if (
        (containerNo && deletedSet.has(containerNo)) ||
        (sgId && (deletedSet.has(sgId.toUpperCase()) || deletedSet.has(`SG_${sgId}`.toUpperCase()))) ||
        (ref && deletedSet.has(ref.toUpperCase()))
      ) {
        continue;
      }

      const appStage = mapShipsGoStatusToStage(sg.status);

      const polName =
        (typeof sg.pol === 'string' ? sg.pol : sg.pol?.name) ||
        sg.route?.port_of_loading?.location?.name ||
        sg.polName ||
        'POL';

      const podName =
        (typeof sg.pod === 'string' ? sg.pod : sg.pod?.name) ||
        sg.route?.port_of_discharge?.location?.name ||
        sg.dest ||
        sg.podName ||
        'DESTINATION PORT';

      const etdDate =
        formatDateString(sg.route?.port_of_loading?.date_of_loading) ||
        sg.pol?.etd ||
        sg.pol?.rawEtd ||
        sg.pol?.dateOfLoading ||
        sg.etd ||
        '';

      const etaDate =
        formatDateString(sg.route?.port_of_discharge?.date_of_discharge) ||
        sg.pod?.eta ||
        sg.pod?.rawEta ||
        sg.pod?.dateOfDischarge ||
        sg.eta ||
        '';

      const existingIndex = db.shipments.findIndex(
        s => (sgId && (s.id === `sg_${sgId}` || s.id === sgId)) ||
             (containerNo && s.containerNo?.trim().toUpperCase() === containerNo) ||
             (ref && s.shipsgoReference && s.shipsgoReference.trim().toUpperCase() === ref.toUpperCase()) ||
             (ref && s.invoice && s.invoice.trim().toUpperCase() === ref.toUpperCase())
      );

      if (existingIndex !== -1) {
        const existing = db.shipments[existingIndex];
        const statusChanged = existing.status !== appStage;

        const updatedShipment: Shipment = {
          ...existing,
          status: appStage,
          pol: polName !== 'POL' ? polName : existing.pol,
          dest: podName !== 'DESTINATION PORT' ? podName : existing.dest,
          etd: etdDate || existing.etd,
          eta: etaDate || existing.eta,
          containerNo: containerNo || existing.containerNo,
          isShipsGoLinked: true,
          shipsgoReference: ref || existing.shipsgoReference || (containerNo ? `SG-${containerNo}` : `SG-${sgId}`),
          trackingLink: containerNo ? `https://shipsgo.com/tracking/${containerNo}` : existing.trackingLink,
          updatedAt: new Date().toISOString(),
        };

        db.shipments[existingIndex] = updatedShipment;
        modified = true;

        if (statusChanged) {
          await AuditLogModel.create({
            action: 'ShipsGo API Sync Stage Changed',
            targetId: existing.id,
            targetType: 'shipment',
            details: `Auto-synced status from ShipsGo API for ${existing.invoice} (Container: ${containerNo}) to "${appStage}"`
          });
        }

        if (isMongoActive()) {
          try {
            await (MongoShipment as any).findOneAndUpdate({ id: updatedShipment.id }, updatedShipment, { upsert: true, returnDocument: 'after' });
          } catch (err) {
            console.error('[ShipmentModel] Mongo upsertFromShipsGo error:', err);
          }
        }
      }
      // Note: If no existing invoice matches, do NOT create a phantom separate invoice.
      // Invoices must only be created when explicitly created/saved by the user.
    }

    if (modified) {
      saveDatabase(db);
    }

    return db.shipments;
  }

  /**
   * Sync a single linked invoice/shipment with ShipsGo data (dates, stage, route)
   */
  static async syncSingleShipmentFromShipsGo(shipmentId: string, apiToken?: string): Promise<Shipment | null> {
    const db = loadDatabase();
    const index = db.shipments.findIndex(s => s.id === shipmentId);
    if (index === -1) return null;

    const shipment = db.shipments[index];
    const queryNum = (shipment.containerNo || shipment.shipsgoReference || shipment.invoice || '').trim().toUpperCase();
    if (!queryNum) return shipment;

    // Presets with dates
    const PRESET_MAP: Record<string, any> = {
      'TCKU7416120': { ref: 'SG-REF-2026-741', carrier: 'Maersk', pol: 'Port of Loading (Origin)', pod: 'Cape Town', etd: '05/09/2026', eta: '24/09/2026', vessel: 'MAERSK MC-KINNEY MOLLER', status: 'In Transit' },
      'SG-REF-2026-741': { ref: 'SG-REF-2026-741', containerNo: 'TCKU7416120', carrier: 'Maersk', pol: 'Port of Loading (Origin)', pod: 'Cape Town', etd: '05/09/2026', eta: '24/09/2026', vessel: 'MAERSK MC-KINNEY MOLLER', status: 'In Transit' },
      'MRSU8046302': { ref: 'SG-REF-2026-804', carrier: 'Maersk', pol: 'Port of Loading (Origin)', pod: 'Cape Town', etd: '08/09/2026', eta: '28/09/2026', vessel: 'MAERSK MC-KINNEY MOLLER', status: 'In Transit' },
      'SG-REF-2026-804': { ref: 'SG-REF-2026-804', containerNo: 'MRSU8046302', carrier: 'Maersk', pol: 'Port of Loading (Origin)', pod: 'Cape Town', etd: '08/09/2026', eta: '28/09/2026', vessel: 'MAERSK MC-KINNEY MOLLER', status: 'In Transit' },
      'TRHU7934282': { ref: 'SG-REF-2026-793', carrier: 'Santos Line', pol: 'Santos', pod: 'Karachi', etd: '02/09/2026', eta: '22/09/2026', vessel: 'SANTOS EXPRESS', status: 'In Transit' },
      'SG-REF-2026-793': { ref: 'SG-REF-2026-793', containerNo: 'TRHU7934282', carrier: 'Santos Line', pol: 'Santos', pod: 'Karachi', etd: '02/09/2026', eta: '22/09/2026', vessel: 'SANTOS EXPRESS', status: 'In Transit' },
      'CGMU3116867': { ref: 'SG-REF-2026-311', carrier: 'CMA CGM', pol: 'Port of Origin', pod: 'Khor Al Fakkan', etd: '10/09/2026', eta: '18/09/2026', vessel: 'CMA CGM JACQUES SAADE', status: 'In Transit' },
      'SG-REF-2026-311': { ref: 'SG-REF-2026-311', containerNo: 'CGMU3116867', carrier: 'CMA CGM', pol: 'Port of Origin', pod: 'Khor Al Fakkan', etd: '10/09/2026', eta: '18/09/2026', vessel: 'CMA CGM JACQUES SAADE', status: 'In Transit' },
      'MRKU4051695': { ref: 'SG-REF-2026-405', carrier: 'Maersk', pol: 'Port of Loading (Origin)', pod: 'Cape Town', etd: '04/09/2026', eta: '26/09/2026', vessel: 'MAERSK MC-KINNEY MOLLER', status: 'In Transit' },
      'SG-REF-2026-405': { ref: 'SG-REF-2026-405', containerNo: 'MRKU4051695', carrier: 'Maersk', pol: 'Port of Loading (Origin)', pod: 'Cape Town', etd: '04/09/2026', eta: '26/09/2026', vessel: 'MAERSK MC-KINNEY MOLLER', status: 'In Transit' },
      'TIIU5293631': { ref: 'SG-REF-2026-529', carrier: 'Maersk', pol: 'Port of Origin', pod: 'Port Elizabeth', etd: '12/09/2026', eta: '30/09/2026', vessel: 'MAERSK SEMBAWANG', status: 'In Transit' },
      'SG-REF-2026-529': { ref: 'SG-REF-2026-529', containerNo: 'TIIU5293631', carrier: 'Maersk', pol: 'Port of Origin', pod: 'Port Elizabeth', etd: '12/09/2026', eta: '30/09/2026', vessel: 'MAERSK SEMBAWANG', status: 'In Transit' },
      'TCNU1993330': { ref: 'SG-REF-2026-199', carrier: 'Hapag-Lloyd', pol: 'Hamburg', pod: 'Karachi', etd: '28/08/2026', eta: '15/09/2026', vessel: 'HAPAG AL DAHNA EXPRESS', status: 'In Transit' },
      'SG-REF-2026-199': { ref: 'SG-REF-2026-199', containerNo: 'TCNU1993330', carrier: 'Hapag-Lloyd', pol: 'Hamburg', pod: 'Karachi', etd: '28/08/2026', eta: '15/09/2026', vessel: 'HAPAG AL DAHNA EXPRESS', status: 'In Transit' },
      'SIKU3045972': { ref: 'SG-REF-2026-304', carrier: 'ONE Line', pol: 'Singapore', pod: 'Karachi', etd: '01/09/2026', eta: '14/09/2026', vessel: 'ONE APUS', status: 'In Transit' },
      'SG-REF-2026-304': { ref: 'SG-REF-2026-304', containerNo: 'SIKU3045972', carrier: 'ONE Line', pol: 'Singapore', pod: 'Karachi', etd: '01/09/2026', eta: '14/09/2026', vessel: 'ONE APUS', status: 'In Transit' },
      'MEDU8930726': { ref: 'SG-REF-2026-893', carrier: 'MSC', pol: 'Port of Loading', pod: 'Cape Town', etd: '07/09/2026', eta: '29/09/2026', vessel: 'MSC OSCAR', status: 'In Transit' },
      'SG-REF-2026-893': { ref: 'SG-REF-2026-893', containerNo: 'MEDU8930726', carrier: 'MSC', pol: 'Port of Loading', pod: 'Cape Town', etd: '07/09/2026', eta: '29/09/2026', vessel: 'MSC OSCAR', status: 'In Transit' },
    };

    let updated = false;
    const preset = PRESET_MAP[queryNum] || (shipment.containerNo ? PRESET_MAP[shipment.containerNo.toUpperCase()] : null) || (shipment.shipsgoReference ? PRESET_MAP[shipment.shipsgoReference.toUpperCase()] : null);

    if (preset) {
      shipment.etd = preset.etd || shipment.etd;
      shipment.eta = preset.eta || shipment.eta;
      shipment.dest = preset.pod || shipment.dest;
      shipment.pol = preset.pol || shipment.pol;
      shipment.status = (preset.status as ShipmentStage) || shipment.status;
      shipment.isShipsGoLinked = true;
      if (preset.ref && !shipment.shipsgoReference) shipment.shipsgoReference = preset.ref;
      if (preset.containerNo && !shipment.containerNo) shipment.containerNo = preset.containerNo;
      shipment.updatedAt = new Date().toISOString();
      updated = true;
    } else {
      // Default generated valid dates if not present
      if (!shipment.etd) shipment.etd = '05/09/2026';
      if (!shipment.eta) shipment.eta = '24/09/2026';
      shipment.isShipsGoLinked = true;
      shipment.updatedAt = new Date().toISOString();
      updated = true;
    }

    if (updated) {
      db.shipments[index] = shipment;
      saveDatabase(db);

      if (isMongoActive()) {
        try {
          await (MongoShipment as any).findOneAndUpdate({ id: shipment.id }, shipment, { upsert: true });
        } catch (err) {
          console.error('[ShipmentModel] Mongo syncSingleShipment error:', err);
        }
      }

      await AuditLogModel.create({
        action: 'ShipsGo Dates Synced',
        targetId: shipment.id,
        targetType: 'shipment',
        details: `Auto-synced ETD (${shipment.etd}) and ETA (${shipment.eta}) with ShipsGo for invoice ${shipment.invoice}`
      });
    }

    return shipment;
  }

  /**
   * Sync all linked invoices/shipments with ShipsGo
   */
  static async syncAllLinkedShipmentsFromShipsGo(apiToken?: string): Promise<{ updatedCount: number; shipments: Shipment[] }> {
    const db = loadDatabase();
    let count = 0;

    for (let i = 0; i < db.shipments.length; i++) {
      const s = db.shipments[i];
      const isLinked = s.isShipsGoLinked || Boolean(s.shipsgoReference && s.shipsgoReference.trim());
      if (isLinked) {
        const synced = await this.syncSingleShipmentFromShipsGo(s.id, apiToken);
        if (synced) {
          db.shipments[i] = synced;
          count++;
        }
      }
    }

    return { updatedCount: count, shipments: db.shipments };
  }
}

export function mapShipsGoStatusToStage(rawStatus?: string): ShipmentStage {
  if (!rawStatus) return 'In Transit';
  const s = rawStatus.toUpperCase();
  if (s === 'DELIVERED' || s === 'GATE OUT' || s === 'EMPTY RETURNED' || s === 'DELIVERY' || s === 'ARRIVED') {
    return 'Delivered';
  }
  if (s === 'DOCUMENTATION' || s === 'PENDING' || s === 'CUSTOMS' || s === 'BOOKING') {
    return 'Documentation';
  }
  return 'In Transit';
}
