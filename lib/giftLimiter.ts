export async function canSuggestGift(suggesterId, receiverId) {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const { data, error } = await supabase
    .from('gift_suggestions')
    .select('id')
    .eq('suggester_id', suggesterId)
    .eq('receiver_id', receiverId)
    .gte('suggested_at', oneWeekAgo.toISOString());

  if (error) return false;
  return data.length < 5;
}