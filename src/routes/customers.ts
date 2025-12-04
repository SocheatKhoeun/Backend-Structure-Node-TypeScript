import express from 'express';
import { auth } from '../middlewares/auth.js';
import { authorizeAction } from '../middlewares/authorizeAction.js';
import { listCustomers, createCustomer, viewCustomer, updateCustomer, updateCustomerStatus,deleteCustomer } from '../controllers/customers.controller.js';

const router = express.Router();

// Apply auth to all customer routes
router.use(auth);

router.get('/', authorizeAction('customers', 'view'), listCustomers);
router.post('/', authorizeAction('customers', 'add'), createCustomer);

router.get('/:global_id', authorizeAction('customers', 'view'), viewCustomer);
router.patch('/:global_id', authorizeAction('customers', 'edit'), updateCustomer);
router.patch('/:global_id/status', authorizeAction('customers', 'edit'), updateCustomerStatus);
router.delete('/:global_id', authorizeAction('customers', 'delete'), deleteCustomer);

export default router;