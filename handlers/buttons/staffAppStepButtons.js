import { handleStaffApplicationStep2 } from '../modals/staffApplicationStep2.js';
import { handleStaffApplicationStep3 } from '../modals/staffApplicationStep3.js';
import { handleStaffApplicationStep4 } from '../modals/staffApplicationStep4.js';
import { handleStaffApplicationStep5 } from '../modals/staffApplicationStep5.js';

export async function handleStaffAppStepButton(interaction) {
  if (interaction.customId === 'staff_app_step2') {
    return await handleStaffApplicationStep2(interaction);
  }
  
  if (interaction.customId === 'staff_app_step3') {
    return await handleStaffApplicationStep3(interaction);
  }
  
  if (interaction.customId === 'staff_app_step4') {
    return await handleStaffApplicationStep4(interaction);
  }
  
  if (interaction.customId === 'staff_app_step5') {
    return await handleStaffApplicationStep5(interaction);
  }
}
