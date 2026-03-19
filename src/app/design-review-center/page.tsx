import { assembleDesignReviewCenter } from '@/lib/design-review-center/assembler';
import DesignReviewCenterClient from './client';

export default async function DesignReviewCenterPage() {
  const data = await assembleDesignReviewCenter();

  return <DesignReviewCenterClient data={data} />;
}
