-- 1) created_at otomatik dolsun (zaten default varsa gerek yok)
-- Ama loglama için örnek trigger/fonksiyon ekliyoruz

-- 2) Log tablosu
CREATE TABLE IF NOT EXISTS public.task_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid,
  action text,
  actor_user_id uuid,
  timestamp timestamp DEFAULT now()
);

-- 3) Fonksiyon: görev silindiğinde logla
CREATE OR REPLACE FUNCTION public.log_task_delete()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.task_logs (task_id, action, actor_user_id)
  VALUES (OLD.id, 'delete', auth.uid());
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4) Trigger: DELETE sonrası çalışsın
DROP TRIGGER IF EXISTS trg_log_task_delete ON public.tasks;

CREATE TRIGGER trg_log_task_delete
AFTER DELETE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.log_task_delete();
