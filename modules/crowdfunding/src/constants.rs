//
//	constants
//

use sp_runtime::ModuleId;

pub const PALLET_ID: ModuleId = ModuleId(*b"zz/crowd");
pub const PALLET_VERSION: &str = "0.1.0";
pub const MAX_CONTRIBUTIONS_PER_BLOCK: usize = 5;
pub const MAX_CAMPAIGN_LENGTH: u32 = 777600;
