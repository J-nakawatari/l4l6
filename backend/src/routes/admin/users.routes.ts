import { Router } from 'express';
import { 
  getUsers, 
  getUserById, 
  updateUser, 
  deleteUser, 
  sendEmailToUser 
} from '../../controllers/admin/users.controller';

const router = Router();

router.get('/', getUsers);
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);
router.post('/:userId/send-email', sendEmailToUser);

export default router;