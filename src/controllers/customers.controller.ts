import type { Request, Response } from 'express';
import BaseService from '../services/base.service.js';

const svc = new BaseService('customers');

// List Customers with search & pagination
export const listCustomers = async (req: Request, res: Response) => {
  const page = req.query.page ? Number(req.query.page) : undefined;
  const perPage = req.query.perPage ? Number(req.query.perPage) : undefined;

  try {
    if (req.query.q) {
      const q = String(req.query.q).trim();
      const data = await svc.list({
        search: { q, fields: ['name', 'email', 'phone_number', 'vat_number'] },
        limit: perPage,
        page,
        paginate: !!page,
      } as any);
      return res.json(data);
    }

    const data = await svc.list({
      limit: perPage,
      page,
      paginate: !!page,
      orderBy: { created_at: 'desc' },
    } as any);

    res.json(data);
  } catch (err: any) {
    console.error('List customers error:', err);
    res.status(500).json({ error: 'Failed to list customers' });
  }
};

// Create Customer
export const createCustomer = async (req: Request, res: Response) => {
  const {
    name,
    email,
    phone_number,
    address,
    type = 'individual',
    vat_number,
    gender,
  } = req.body;

  if (!name || !email || !phone_number) {
    return res.status(400).json({
      error: 'Name, email and phone number are required',
    });
  }

  try {
    const customer = await svc.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone_number: phone_number.trim(),
      address: address?.trim() || null,
      type,
      vat_number: vat_number?.trim() || null,
      gender: gender || null,
      status: 1,
      created_by: req.user?.id ?? null,
    });

    res.status(201).json({
      message: 'Customer created successfully',
      data: customer,
    });
  } catch (err: any) {
    if (err.code === '23505') {
      const field = err.constraint.includes('email') ? 'email' : 'phone_number';
      return res.status(409).json({
        error: `Customer with this ${field} already exists`,
      });
    }
    console.error('Create customer error:', err);
    res.status(500).json({ error: 'Failed to create customer' });
  }
};

// View Customer by global_id
export const viewCustomer = async (req: Request, res: Response) => {
  const { global_id } = req.params;
  if (!global_id) return res.status(400).json({ error: 'Missing global_id' });

  try {
    const customer = await svc.findByGlobalId(global_id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    res.json(customer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
};

// Update Customer by global_id
export const updateCustomer = async (req: Request, res: Response) => {
  const { global_id } = req.params;
  if (!global_id) return res.status(400).json({ error: 'Missing global_id' });

  const {
    name,
    email,
    phone_number,
    address,
    type,
    vat_number,
    gender,
    status,
  } = req.body;

  try {
    const updated = await svc.updateByGlobalId(global_id, {
      name: name?.trim(),
      email: email ? email.toLowerCase().trim() : undefined,
      phone_number: phone_number?.trim(),
      address: address?.trim() || null,
      type,
      vat_number: vat_number?.trim() || null,
      gender: gender || null,
      status: status ?? 1,
      updated_by: req.user?.id ?? null,
    });

    if (!updated) return res.status(404).json({ error: 'Customer not found' });

    res.json({
      message: 'Customer updated successfully',
      data: updated,
    });
  } catch (err: any) {
    if (err.code === '23505') {
      const field = err.constraint.includes('email') ? 'email' : 'phone_number';
      return res.status(409).json({
        error: `Another customer already uses this ${field}`,
      });
    }
    console.error('Update customer error:', err);
    res.status(500).json({ error: 'Failed to update customer' });
  }
};

// Update Status Only (activate / deactivate / delete)
export const updateCustomerStatus = async (req: Request, res: Response) => {
  const { global_id } = req.params;
  const { status } = req.body;

  if (!global_id) return res.status(400).json({ error: 'Missing global_id' });
  if (![0, 1, 2].includes(Number(status))) {
    return res.status(400).json({ error: 'Status must be 0, 1 or 2' });
  }

  try {
    const customer = await svc.updateStatusByGlobalId(global_id, Number(status));
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    // If soft deleting
    if (Number(status) === 2) {
      await svc.updateByGlobalId(global_id, {
        deleted_by: req.user?.id ?? null,
        deleted_at: new Date(),
      });
    }

    res.json({
      message: 'Customer status updated',
      data: customer,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update status' });
  }
};

// Soft Delete Customer
export const deleteCustomer = async (req: Request, res: Response) => {
  const { global_id } = req.params;
  if (!global_id) return res.status(400).json({ error: 'Missing global_id' });

  try {
    const customer = await svc.updateStatusByGlobalId(global_id, 2);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    await svc.updateByGlobalId(global_id, {
      deleted_by: req.user?.id ?? null,
      deleted_at: new Date(),
    });

    res.json({
      message: 'Customer deleted successfully',
      data: customer,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
};