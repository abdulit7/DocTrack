import { Request, Response } from 'express';
import { CustomerModel } from '../models/Customer.js';
import { APIResponse, Customer } from '../types/index.js';

/**
 * Controller: Customer
 * Handles HTTP operations for Customer compliance records and document requirements.
 */

export class CustomerController {
  // GET /api/customers
  static async getAll(req: Request, res: Response<APIResponse<Customer[]>>) {
    try {
      const customers = await CustomerModel.find();
      return res.status(200).json({ success: true, data: customers });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message || 'Failed to fetch customers' });
    }
  }

  // GET /api/customers/:id
  static async getById(req: Request, res: Response<APIResponse<Customer>>) {
    try {
      const customer = await CustomerModel.findById(req.params.id);
      if (!customer) {
        return res.status(404).json({ success: false, error: 'Customer not found' });
      }
      return res.status(200).json({ success: true, data: customer });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // POST /api/customers
  static async create(req: Request, res: Response<APIResponse<Customer>>) {
    try {
      const { name, requiredDocs, docs } = req.body;
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ success: false, error: 'Customer name is required' });
      }

      const customer = await CustomerModel.create({
        name: name.trim(),
        requiredDocs,
        docs
      });

      return res.status(201).json({ success: true, data: customer, message: 'Customer created successfully' });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // PUT /api/customers/:id
  static async update(req: Request, res: Response<APIResponse<Customer>>) {
    try {
      const updated = await CustomerModel.findByIdAndUpdate(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Customer not found' });
      }
      return res.status(200).json({ success: true, data: updated, message: 'Customer updated successfully' });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // DELETE /api/customers/:id
  static async delete(req: Request, res: Response<APIResponse<null>>) {
    try {
      const deleted = await CustomerModel.findByIdAndDelete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Customer not found' });
      }
      return res.status(200).json({ success: true, message: 'Customer deleted successfully' });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}
