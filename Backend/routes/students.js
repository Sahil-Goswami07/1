import express from 'express';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import { listStudents, updateStudent, deleteStudent } from '../controllers/studentController.js';

const router = express.Router();

router.get('/', authenticate, authorize('universityAdmin','superAdmin'), listStudents);
router.put('/:id', authenticate, authorize('universityAdmin','superAdmin'), updateStudent);
router.delete('/:id', authenticate, authorize('universityAdmin','superAdmin'), deleteStudent);

export default router;
