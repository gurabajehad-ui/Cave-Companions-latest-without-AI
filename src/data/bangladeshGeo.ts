export interface DistrictData {
  district: string;
  districtBn: string;
  aliases?: string[];
  upazilas: string[];
  upazilasBn?: string[];
}

export interface UpazilaItem {
  nameBn: string;
  nameEn: string;
  label: string; // e.g. "বাগেরহাট সদর (Bagerhat Sadar)"
}

export const BANGLADESH_DISTRICTS: DistrictData[] = [
  {
    district: 'Bagerhat',
    districtBn: 'বাগেরহাট',
    upazilas: ['Bagerhat Sadar', 'Chitalmari', 'Fakirhat', 'Kachua', 'Mollahat', 'Mongla', 'Morrelganj', 'Rampal', 'Sarankhola'],
    upazilasBn: ['বাগেরহাট সদর', 'চিতলমারী', 'ফকিরহাট', 'কচুয়া', 'মোল্লাহাট', 'মোংলা', 'মোরেলগঞ্জ', 'রামপাল', 'শরণখোলা']
  },
  {
    district: 'Bandarban',
    districtBn: 'বান্দরবান',
    upazilas: ['Bandarban Sadar', 'Ali Kadam', 'Lama', 'Naikhongchhari', 'Rowangchhari', 'Ruma', 'Thanchi'],
    upazilasBn: ['বান্দরবান সদর', 'আলীকদম', 'লামা', 'নাইক্ষ্যংছড়ি', 'রোয়াংছড়ি', 'রুমা', 'থানচি']
  },
  {
    district: 'Barguna',
    districtBn: 'বরগুনা',
    upazilas: ['Barguna Sadar', 'Amtali', 'Bamna', 'Betagi', 'Pathorghata', 'Taltali'],
    upazilasBn: ['বরগুনা সদর', 'আমতলী', 'বামনা', 'বেতাগী', 'পাথরঘাটা', 'তালতলী']
  },
  {
    district: 'Barishal',
    districtBn: 'বরিশাল',
    aliases: ['Barisal', 'বরিশাল'],
    upazilas: ['Barishal Sadar', 'Agailjhara', 'Babuganj', 'Bakerganj', 'Banaripara', 'Gournadi', 'Hizla', 'Mehendiganj', 'Muladi', 'Wazirpur'],
    upazilasBn: ['বরিশাল সদর', 'আগৈলঝাড়া', 'বাবুগঞ্জ', 'বাকেরগঞ্জ', 'বানারীপাড়া', 'গৌরনদী', 'হিজলা', 'মেহেন্দীগঞ্জ', 'মুলাদী', 'উজিরপুর']
  },
  {
    district: 'Bhola',
    districtBn: 'ভোলা',
    upazilas: ['Bhola Sadar', 'Burhanuddin', 'Char Fasson', 'Daulatkhan', 'Lalmohan', 'Manpura', 'Tazumuddin'],
    upazilasBn: ['ভোলা সদর', 'বোরহানউদ্দিন', 'চরফ্যাশন', 'দৌলতখান', 'লালমোহন', 'মনপুরা', 'তজুমদ্দিন']
  },
  {
    district: 'Bogura',
    districtBn: 'বগুড়া',
    aliases: ['Bogra', 'বগুড়া', 'বগুড়া'],
    upazilas: ['Bogra Sadar', 'Adamdighi', 'Dhunat', 'Dhupchanchia', 'Gabtali', 'Kahaloo', 'Nandigram', 'Sariakandi', 'Shahjahanpur', 'Sherpur', 'Shibganj'],
    upazilasBn: ['বগুড়া সদর', 'আদমদীঘি', 'ধুনট', 'দুপচাঁচিয়া', 'গাবতলী', 'কাহালু', 'নন্দীগ্রাম', 'সারিয়াকান্দি', 'শাজাহানপুর', 'শেরপুর', 'শিবগঞ্জ']
  },
  {
    district: 'Brahmanbaria',
    districtBn: 'ব্রাহ্মণবাড়িয়া',
    aliases: ['Brahmanbaria', 'Bramonbaria', 'ব্রাহ্মণবাড়িয়া', 'ব্রাহ্মণবাড়িয়া'],
    upazilas: ['Brahmanbaria Sadar', 'Akhaura', 'Ashuganj', 'Bancharampur', 'Bijoynagar', 'Kasba', 'Nabinagar', 'Nasirnagar', 'Sarail'],
    upazilasBn: ['ব্রাহ্মণবাড়িয়া সদর', 'আখাউড়া', 'আশুগঞ্জ', 'বাঞ্ছারামপুর', 'বিজয়নগর', 'কসবা', 'নবীনগর', 'নাসিরনগর', 'সরাইল']
  },
  {
    district: 'Chandpur',
    districtBn: 'চাঁদপুর',
    upazilas: ['Chandpur Sadar', 'Faridganj', 'Haimchar', 'Haziganj', 'Kachua', 'Matlab Dakshin', 'Matlab Uttar', 'Shahrasti'],
    upazilasBn: ['চাঁদপুর সদর', 'ফরিদগঞ্জ', 'হাইমচর', 'হাজীগঞ্জ', 'কচুয়া', 'মতলব দক্ষিণ', 'মতলব উত্তর', 'শাহরাস্তি']
  },
  {
    district: 'Chattogram',
    districtBn: 'চট্টগ্রাম',
    aliases: ['Chittagong', 'Chattagram', 'চট্টগ্রাম', 'চট্রগ্রাম'],
    upazilas: ['Chattogram Sadar', 'Anwara', 'Banshkhali', 'Boalkhali', 'Chandanaish', 'Fatikchhari', 'Hathazari', 'Karnaphuli', 'Lohagara', 'Mirsharai', 'Patiya', 'Rangunia', 'Raozan', 'Sandwip', 'Satkania', 'Sitakunda'],
    upazilasBn: ['চট্টগ্রাম সদর', 'আনোয়ারা', 'বাঁশখালী', 'বোয়ালখালী', 'চন্দনাইশ', 'ফটিকছড়ি', 'হাটহাজারী', 'কর্ণফুলী', 'লোহাগাড়া', 'মিরসরাই', 'পটিয়া', 'রাঙ্গুনিয়া', 'রাউজান', 'সন্দ্বীপ', 'সাতকানিয়া', 'সীতাকুণ্ড']
  },
  {
    district: 'Chuadanga',
    districtBn: 'চুয়াডাঙ্গা',
    aliases: ['চুয়াডাঙ্গা', 'চুয়াডাঙ্গা'],
    upazilas: ['Chuadanga Sadar', 'Alamdanga', 'Damurhuda', 'Jibannagar'],
    upazilasBn: ['চুয়াডাঙ্গা সদর', 'আলমডাঙ্গা', 'দামুড়হুদা', 'জীবননগর']
  },
  {
    district: 'Cumilla',
    districtBn: 'কুমিল্লা',
    aliases: ['Comilla', 'কুমিল্লা'],
    upazilas: ['Cumilla Sadar', 'Barura', 'Brahmanpara', 'Burichang', 'Chandina', 'Chauddagram', 'Daudkandi', 'Debidwar', 'Homna', 'Laksam', 'Lalmai', 'Meghna', 'Monohorgonj', 'Muradnagar', 'Nangalkot', 'Sadar Dakshin', 'Titas'],
    upazilasBn: ['কুমিল্লা সদর', 'বরুড়া', 'ব্রাহ্মণপাড়া', 'বুড়িচং', 'চান্দিনা', 'চৌদ্দগ্রাম', 'দাউদকান্দি', 'দেবীদ্বার', 'হোমনা', 'লাকসাম', 'লালমাই', 'মেঘনা', 'মনোহরগঞ্জ', 'মুরাদনগর', 'নাঙ্গলকোট', 'সদর দক্ষিণ', 'তিতাস']
  },
  {
    district: "Cox's Bazar",
    districtBn: 'কক্সবাজার',
    aliases: ['Coxs Bazar', 'Coxsbazar', 'কক্সবাজার'],
    upazilas: ["Cox's Bazar Sadar", 'Chakaria', 'Kutubdia', 'Maheshkhali', 'Pekua', 'Ramu', 'Teknaf', 'Ukhia'],
    upazilasBn: ['কক্সবাজার সদর', 'চকোরিয়া', 'কুতুবদিয়া', 'মহেশখালী', 'পেকুয়া', 'রামু', 'টেকনাফ', 'উখিয়া']
  },
  {
    district: 'Dhaka',
    districtBn: 'ঢাকা',
    aliases: ['Dhaka', 'ঢাকা'],
    upazilas: [
      'Dhaka Sadar', 'Adabor', 'Badda', 'Bangshal', 'Bimanbandar', 'Cantonment', 'Chawkbazar',
      'Dakshinkhan', 'Darus Salam', 'Demra', 'Dhamrai', 'Dhanmondi', 'Dohar', 'Gendaria',
      'Gulshan', 'Hazaribagh', 'Jatrabari', 'Kadamtali', 'Kafrul', 'Kalabagan', 'Kamrangirchar',
      'Keraniganj', 'Khilgaon', 'Khilkhet', 'Kotwali', 'Lalbagh', 'Mirpur', 'Mohammadpur',
      'Motijheel', 'Nawabganj', 'New Market', 'Pallabi', 'Paltan', 'Ramna', 'Rampura',
      'Sabujbagh', 'Savar', 'Shah Ali', 'Shahbagh', 'Sher-e-Bangla Nagar', 'Shyampur', 'Sutrapur',
      'Tejgaon', 'Tejgaon Industrial Area', 'Turag', 'Uttara', 'Uttar Khan'
    ],
    upazilasBn: [
      'ঢাকা সদর', 'আদাবর', 'বাড্ডা', 'বংশাল', 'বিমানবন্দর', 'ক্যান্টনমেন্ট', 'চকবাজার',
      'দক্ষিণখান', 'দারুস সালাম', 'ডেমরা', 'ধামরাই', 'ধানমন্ডি', 'দোহার', 'গেন্ডারিয়া',
      'গুলশান', 'হাজারীবাগ', 'যাত্রাবাড়ী', 'কদমতলী', 'কাফরুল', 'কলাবাগান', 'কামরাঙ্গীরচর',
      'কেরানীগঞ্জ', 'খিলগাঁও', 'খিলক্ষেত', 'কোতোয়ালী', 'লালবাগ', 'মিরপুর', 'মোহাম্মদপুর',
      'মতিঝিল', 'নবাবগঞ্জ', 'নিউ মার্কেট', 'পল্লবী', 'পল্টন', 'রমনা', 'রামপুরা',
      'সবুজবাগ', 'সাভার', 'শাহ আলী', 'শাহবাগ', 'শেরেবাংলা নগর', 'শ্যামপুর', 'সূত্রাপুর',
      'তেজগাঁও', 'তেজগাঁও শিল্পাঞ্চল', 'তুরাগ', 'উত্তরা', 'উত্তরখান'
    ]
  },
  {
    district: 'Dinajpur',
    districtBn: 'দিনাজপুর',
    upazilas: ['Dinajpur Sadar', 'Birampur', 'Birganj', 'Bochaganj', 'Chirirbandar', 'Fulbari', 'Ghoraghat', 'Hakimpur', 'Kaharole', 'Khansama', 'Nawabganj', 'Parbatipur'],
    upazilasBn: ['দিনাজপুর সদর', 'বিরামপুর', 'বীরগঞ্জ', 'বোচাগঞ্জ', 'চিরিরবন্দর', 'ফুলবাড়ী', 'ঘোড়াঘাট', 'হাকিমপুর', 'কাহারোল', 'খানসামা', 'নবাবগঞ্জ', 'পার্বতীপুর']
  },
  {
    district: 'Faridpur',
    districtBn: 'ফরিদপুর',
    upazilas: ['Faridpur Sadar', 'Alfadanga', 'Bhanga', 'Boalmari', 'Charbhadrasan', 'Madhukhali', 'Nagarkanda', 'Sadarpur', 'Saltha'],
    upazilasBn: ['ফরিদপুর সদর', 'আলফাডাঙ্গা', 'ভাঙ্গা', 'বোয়ালমারী', 'চরভদ্রাসন', 'মধুখালী', 'নগরকান্দা', 'সদরপুর', 'সালথা']
  },
  {
    district: 'Feni',
    districtBn: 'ফেনী',
    upazilas: ['Feni Sadar', 'Chhagalnaiya', 'Daganbhuiyan', 'Fulgazi', 'Parshuram', 'Sonagazi'],
    upazilasBn: ['ফেনী সদর', 'ছাগলনাইয়া', 'দাগনভূঞা', 'ফুলগাজী', 'পরশুরাম', 'সোনাগাজী']
  },
  {
    district: 'Gaibandha',
    districtBn: 'গাইবান্ধা',
    aliases: ['গাইবান্দা', 'গাইবান্ধা'],
    upazilas: ['Gaibandha Sadar', 'Fulchhari', 'Gobindaganj', 'Palashbari', 'Sadullapur', 'Saghata', 'Sundarganj'],
    upazilasBn: ['গাইবান্ধা সদর', 'ফুলছড়ি', 'গোবিন্দগঞ্জ', 'পলাশবাড়ী', 'সাদুল্লাপুর', 'সাঘাটা', 'সুন্দরগঞ্জ']
  },
  {
    district: 'Gazipur',
    districtBn: 'গাজীপুর',
    upazilas: ['Gazipur Sadar', 'Kaliakair', 'Kaliganj', 'Kapasia', 'Sreepur', 'Tongi'],
    upazilasBn: ['গাজীপুর সদর', 'কালিয়াকৈর', 'কালীগঞ্জ', 'কাপাসিয়া', 'শ্রীপুর', 'টঙ্গী']
  },
  {
    district: 'Gopalganj',
    districtBn: 'গোপালগঞ্জ',
    upazilas: ['Gopalganj Sadar', 'Kashiani', 'Kotalipara', 'Muksudpur', 'Tungipara'],
    upazilasBn: ['গোপালগঞ্জ সদর', 'কাশিয়ানী', 'কোটালীপাড়া', 'মুকসুদপুর', 'টুঙ্গিপাড়া']
  },
  {
    district: 'Habiganj',
    districtBn: 'হবিগঞ্জ',
    aliases: ['Hobiganj', 'Hobigonj', 'হবিগঞ্জ'],
    upazilas: ['Habiganj Sadar', 'Ajmiriganj', 'Bahubal', 'Baniachong', 'Chunarughat', 'Lakhai', 'Madhabpur', 'Nabiganj', 'Shayestaganj'],
    upazilasBn: ['হবিগঞ্জ সদর', 'আজমিরীগঞ্জ', 'বাহুবল', 'বানিয়াচং', 'চুনারুঘাট', 'লাখাই', 'মাধবপুর', 'নবীগঞ্জ', 'শায়েস্তাগঞ্জ']
  },
  {
    district: 'Jamalpur',
    districtBn: 'জামালপুর',
    upazilas: ['Jamalpur Sadar', 'Baksiganj', 'Dewanganj', 'Islampur', 'Madarganj', 'Melandaha', 'Sarishabari'],
    upazilasBn: ['জামালপুর সদর', 'বকশীগঞ্জ', 'দেওয়ানগঞ্জ', 'ইসলামপুর', 'মাদারগঞ্জ', 'মেলান্দহ', 'সরিষাবাড়ী']
  },
  {
    district: 'Jashore',
    districtBn: 'যশোর',
    aliases: ['Jessore', 'যশোর'],
    upazilas: ['Jashore Sadar', 'Abhaynagar', 'Bagherpara', 'Chaugachha', 'Jhikargachha', 'Keshabpur', 'Manirampur', 'Sharsha'],
    upazilasBn: ['যশোর সদর', 'অভয়নগর', 'বাঘারপাড়া', 'চৌগাছা', 'ঝিকরগাছা', 'কেশবপুর', 'মনিরামপুর', 'শার্শা']
  },
  {
    district: 'Jhalokathi',
    districtBn: 'ঝালকাঠি',
    aliases: ['Jhalakati', 'Jhalakathi', 'ঝালকাঠি', 'ঝালকাঠী'],
    upazilas: ['Jhalokathi Sadar', 'Kanthalia', 'Nalchity', 'Rajapur'],
    upazilasBn: ['ঝালকাঠি সদর', 'কাঁঠালিয়া', 'নলছিটি', 'রাজাপুর']
  },
  {
    district: 'Jhenaidah',
    districtBn: 'ঝিনাইদহ',
    upazilas: ['Jhenaidah Sadar', 'Harinakunda', 'Kaliganj', 'Kotchandpur', 'Maheshpur', 'Shailkupa'],
    upazilasBn: ['ঝিনাইদহ সদর', 'হরিণাকুণ্ডু', 'কালীগঞ্জ', 'কোটচাঁদপুর', 'মহেশপুর', 'শৈলকূপা']
  },
  {
    district: 'Joypurhat',
    districtBn: 'জয়পুরহাট',
    aliases: ['জয়পুরহাট', 'জয়পুরহাট'],
    upazilas: ['Joypurhat Sadar', 'Akkelpur', 'Kalai', 'Khetlal', 'Panchbibi'],
    upazilasBn: ['জয়পুরহাট সদর', 'আক্কেলপুর', 'কালাই', 'ক্ষেতলাল', 'পাঁচবিবি']
  },
  {
    district: 'Khagrachhari',
    districtBn: 'খাগড়াছড়ি',
    aliases: ['Khagrachari', 'খাগড়াছড়ি', 'খাগড়াছড়ি'],
    upazilas: ['Khagrachhari Sadar', 'Dighinala', 'Guimara', 'Lakshmichhari', 'Mahalchhari', 'Manaikchhari', 'Matiranga', 'Panchhari', 'Ramgarh'],
    upazilasBn: ['খাগড়াছড়ি সদর', 'দিঘীনালা', 'গুইমারা', 'লক্ষ্মীছড়ি', 'মহালছড়ি', 'মানিকছড়ি', 'মাটিরাঙ্গা', 'পানছড়ি', 'রামগড়']
  },
  {
    district: 'Khulna',
    districtBn: 'খুলনা',
    upazilas: ['Khulna Sadar', 'Batiaghata', 'Dacope', 'Dumuria', 'Dighalia', 'Koyra', 'Paikgachha', 'Phultala', 'Rupsha', 'Terokhada', 'Daulatpur', 'Khalishpur', 'Khan Jahan Ali', 'Sonadanga', 'Harintana'],
    upazilasBn: ['খুলনা সদর', 'বটিয়াঘাটা', 'দাকোপ', 'ডুমুরিয়া', 'দিঘলিয়া', 'কয়রা', 'পাইকগাছা', 'ফুলতলা', 'রূপসা', 'তেরখাদা', 'দৌলতপুর', 'খালিশপুর', 'খান জাহান আলী', 'সোনাডাঙ্গা', 'হরিণটানা']
  },
  {
    district: 'Kishoreganj',
    districtBn: 'কিশোরগঞ্জ',
    upazilas: ['Kishoreganj Sadar', 'Austagram', 'Bajitpur', 'Bhairab', 'Hossainpur', 'Itna', 'Karimganj', 'Katiadi', 'Kuliarchar', 'Mithamain', 'Nikli', 'Pakundia', 'Tarail'],
    upazilasBn: ['কিশোরগঞ্জ সদর', 'অষ্টগ্রাম', 'বাজিতপুর', 'ভৈরব', 'হোসেনপুর', 'ইটনা', 'করিমগঞ্জ', 'কটিয়াদী', 'কুলিয়ারচর', 'মিঠামইন', 'নিকলী', 'পাকুন্দিয়া', 'তাড়াইল']
  },
  {
    district: 'Kurigram',
    districtBn: 'কুড়িগ্রাম',
    aliases: ['কুড়িগ্রাম', 'কুড়িগ্রাম'],
    upazilas: ['Kurigram Sadar', 'Bhurungamari', 'Char Rajibpur', 'Chilmari', 'Phulbari', 'Rajarhat', 'Rajibpur', 'Roumari', 'Ulipur'],
    upazilasBn: ['কুড়িগ্রাম সদর', 'ভুরুঙ্গামারী', 'চর রাজিবপুর', 'চিলমারী', 'ফুলবাড়ী', 'রাজারহাট', 'রাজিবপুর', 'রৌমারী', 'উলিপুর']
  },
  {
    district: 'Kushtia',
    districtBn: 'কুষ্টিয়া',
    aliases: ['কুষ্টিয়া', 'কুষ্টিয়া'],
    upazilas: ['Kushtia Sadar', 'Bheramara', 'Daulatpur', 'Khoksa', 'Kumarkhali', 'Mirpur'],
    upazilasBn: ['কুষ্টিয়া সদর', 'ভেড়ামারা', 'দৌলতপুর', 'খোকসা', 'কুমারখালী', 'মিরপুর']
  },
  {
    district: 'Lakshmipur',
    districtBn: 'লক্ষ্মীপুর',
    aliases: ['Laxmipur', 'লক্ষ্মীপুর', 'লক্ষীপুর'],
    upazilas: ['Lakshmipur Sadar', 'Kamalnagar', 'Raipur', 'Ramganj', 'Ramgati'],
    upazilasBn: ['লক্ষ্মীপুর সদর', 'কমলনগর', 'রায়পুর', 'রামগঞ্জ', 'রামগতি']
  },
  {
    district: 'Lalmonirhat',
    districtBn: 'লালমনিরহাট',
    upazilas: ['Lalmonirhat Sadar', 'Aditmari', 'Hatibandha', 'Kaliganj', 'Patgram'],
    upazilasBn: ['লালমনিরহাট সদর', 'আদিতমারী', 'হাতীবান্ধা', 'কালীগঞ্জ', 'পাটগ্রাম']
  },
  {
    district: 'Madaripur',
    districtBn: 'মাদারীপুর',
    upazilas: ['Madaripur Sadar', 'Dasar', 'Kalkini', 'Rajoir', 'Shibchar'],
    upazilasBn: ['মাদারীপুর সদর', 'ডাসার', 'কালকিনি', 'রাজৈর', 'শিবচর']
  },
  {
    district: 'Magura',
    districtBn: 'মাগুরা',
    upazilas: ['Magura Sadar', 'Mohammadpur', 'Shalikha', 'Sreepur'],
    upazilasBn: ['মাগুরা সদর', 'মোহাম্মদপুর', 'শালিখা', 'শ্রীপুর']
  },
  {
    district: 'Manikganj',
    districtBn: 'মানিকগঞ্জ',
    upazilas: ['Manikganj Sadar', 'Daulatpur', 'Gior', 'Harirampur', 'Saturia', 'Shivalaya', 'Singair'],
    upazilasBn: ['মানিকগঞ্জ সদর', 'দৌলতপুর', 'ঘিওর', 'হরিরামপুর', 'সাটুরিয়া', 'শিবালয়', 'সিংগাইর']
  },
  {
    district: 'Meherpur',
    districtBn: 'মেহেরপুর',
    upazilas: ['Meherpur Sadar', 'Gangni', 'Mujibnagar'],
    upazilasBn: ['মেহেরপুর সদর', 'গাংনী', 'মুজিবনগর']
  },
  {
    district: 'Moulvibazar',
    districtBn: 'মৌলভীবাজার',
    aliases: ['Maulvibazar', 'Moulvibazar', 'মৌলভীবাজার'],
    upazilas: ['Moulvibazar Sadar', 'Barlekha', 'Juri', 'Kamalganj', 'Kulaura', 'Rajnagar', 'Sreemangal'],
    upazilasBn: ['মৌলভীবাজার সদর', 'বড়লেখা', 'জুড়ী', 'কমলগঞ্জ', 'কুলাউড়া', 'রাজনগর', 'শ্রীমঙ্গল']
  },
  {
    district: 'Munshiganj',
    districtBn: 'মুন্সীগঞ্জ',
    aliases: ['Munshigonj', 'মুন্সীগঞ্জ', 'মুন্সিগঞ্জ'],
    upazilas: ['Munshiganj Sadar', 'Gazaria', 'Lohajang', 'Sirajdikhan', 'Sreenagar', 'Tongibari'],
    upazilasBn: ['মুন্সীগঞ্জ সদর', 'গজারিয়া', 'লৌহজং', 'সিরাজদিখান', 'শ্রীনগর', 'টংগিবাড়ী']
  },
  {
    district: 'Mymensingh',
    districtBn: 'ময়মনসিংহ',
    aliases: ['ময়মনসিংহ', 'ময়মনসিংহ'],
    upazilas: ['Mymensingh Sadar', 'Bhaluka', 'Dhobaura', 'Fulbaria', 'Gaffargaon', 'Gauripur', 'Haluaghat', 'Ishwarganj', 'Muktagachha', 'Nandail', 'Phulpur', 'Tara Khanda', 'Trishal'],
    upazilasBn: ['ময়মনসিংহ সদর', 'ভালুকা', 'ধোবাউড়া', 'ফুলবাড়ীয়া', 'গফরগাঁও', 'গৌরীপুর', 'হালুয়াঘাট', 'ঈশ্বরগঞ্জ', 'মুক্তাগাছা', 'নান্দাইল', 'ফুলপুর', 'তারাকান্দা', 'ত্রিশাল']
  },
  {
    district: 'Naogaon',
    districtBn: 'নওগাঁ',
    upazilas: ['Naogaon Sadar', 'Atrai', 'Badalgachhi', 'Dhamoirhat', 'Manda', 'Mohadevpur', 'Niamatpur', 'Patnitala', 'Porsha', 'Raninagar', 'Sapahar'],
    upazilasBn: ['নওগাঁ সদর', 'আত্রাই', 'বদলগাছী', 'ধামইরহাট', 'মান্দা', 'মহাদেবপুর', 'নিয়ামতপুর', 'পত্নীতলা', 'পোরশা', 'রাণীনগর', 'সাপাহার']
  },
  {
    district: 'Narail',
    districtBn: 'নড়াইল',
    aliases: ['নড়াইল', 'নড়াইল'],
    upazilas: ['Narail Sadar', 'Kalia', 'Lohagara'],
    upazilasBn: ['নড়াইল সদর', 'কালিয়া', 'লোহাগড়া']
  },
  {
    district: 'Narayanganj',
    districtBn: 'নারায়ণগঞ্জ',
    aliases: ['Narayangonj', 'নারায়ণগঞ্জ', 'নারায়ণগঞ্জ'],
    upazilas: ['Narayanganj Sadar', 'Araihazar', 'Bandar', 'Rupganj', 'Sonargaon'],
    upazilasBn: ['নারায়ণগঞ্জ সদর', 'আড়াইহাজার', 'বন্দর', 'রূপগঞ্জ', 'সোনারগাঁও']
  },
  {
    district: 'Narsingdi',
    districtBn: 'নরসিংদী',
    upazilas: ['Narsingdi Sadar', 'Belabo', 'Monohardi', 'Palash', 'Raipura', 'Shibpur'],
    upazilasBn: ['নরসিংদী সদর', 'বেলাবো', 'মনোহরদী', 'পলাশ', 'রায়পুরা', 'শিবপুর']
  },
  {
    district: 'Natore',
    districtBn: 'নাটোর',
    upazilas: ['Natore Sadar', 'Bagatipara', 'Baraigram', 'Gurudaspur', 'Lalpur', 'Naldanga', 'Singra'],
    upazilasBn: ['নাটোর সদর', 'বাগাতিপাড়া', 'বড়াইগ্রাম', 'গুরুদাসপুর', 'লালপুর', 'নলডাঙ্গা', 'সিংড়া']
  },
  {
    district: 'Netrokona',
    districtBn: 'নেত্রকোণা',
    aliases: ['Netrakona', 'নেত্রকোণা', 'নেত্রকোনা'],
    upazilas: ['Netrokona Sadar', 'Atpara', 'Barhatta', 'Durgapur', 'Kalmakanda', 'Kendua', 'Khaliajuri', 'Madan', 'Mohanganj', 'Purbadhala'],
    upazilasBn: ['নেত্রকোণা সদর', 'আটপাড়া', 'বারহাট্টা', 'দূর্গাপুর', 'কলমাকান্দা', 'কেন্দুয়া', 'খালিয়াজুড়ি', 'মদন', 'মোহনগঞ্জ', 'পূর্বধলা']
  },
  {
    district: 'Nilphamari',
    districtBn: 'নীলফামারী',
    upazilas: ['Nilphamari Sadar', 'Dimla', 'Domar', 'Jaldhaka', 'Kishoreganj', 'Saidpur'],
    upazilasBn: ['নীলফামারী সদর', 'ডিমলা', 'ডোমার', 'জলঢাকা', 'কিশোরগঞ্জ', 'সৈয়দপুর']
  },
  {
    district: 'Noakhali',
    districtBn: 'নোয়াখালী',
    aliases: ['নোয়াখালী', 'নোয়াখালী'],
    upazilas: ['Noakhali Sadar', 'Begumganj', 'Chatkhil', 'Companiganj', 'Hatiya', 'Kabirhat', 'Senbagh', 'Subarnachar', 'Sonaimuri'],
    upazilasBn: ['নোয়াখালী সদর', 'বেগমগঞ্জ', 'চাটখিল', 'কোম্পানীগঞ্জ', 'হাতিয়া', 'কবিরহাট', 'সেনবাগ', 'সুবর্ণচর', 'সোনাইমুড়ী']
  },
  {
    district: 'Pabna',
    districtBn: 'পাবনা',
    upazilas: ['Pabna Sadar', 'Atgharia', 'Bera', 'Bhangura', 'Chatmohar', 'Faridpur', 'Ishwardi', 'Santhia', 'Sujanagar'],
    upazilasBn: ['পাবনা সদর', 'আটঘরিয়া', 'বেড়া', 'ভাঙ্গুড়া', 'চাটমোহর', 'ফরিদপুর', 'ঈশ্বরদী', 'সাঁথিয়া', 'সুজানগর']
  },
  {
    district: 'Panchagarh',
    districtBn: 'পঞ্চগড়',
    aliases: ['Panchagar', 'পঞ্চগড়', 'পঞ্চগড়'],
    upazilas: ['Panchagarh Sadar', 'Atwari', 'Boda', 'Debiganj', 'Tetulia'],
    upazilasBn: ['পঞ্চগড় সদর', 'আটোয়ারী', 'বোদা', 'দেবীগঞ্জ', 'তেঁতুলিয়া']
  },
  {
    district: 'Patuakhali',
    districtBn: 'পটুয়াখালী',
    aliases: ['পটুয়াখালী', 'পটুয়াখালী'],
    upazilas: ['Patuakhali Sadar', 'Bauphal', 'Dashmina', 'Dumki', 'Galachipa', 'Kalapara', 'Mirzaganj', 'Rangabali'],
    upazilasBn: ['পটুয়াখালী সদর', 'বাউফল', 'দশমিনা', 'দুমকি', 'গলাচিপা', 'কলাপাড়া', 'মির্জাগঞ্জ', 'রাঙ্গাবালী']
  },
  {
    district: 'Pirojpur',
    districtBn: 'পিরোজপুর',
    upazilas: ['Pirojpur Sadar', 'Bhandaria', 'Kawkhali', 'Mathbaria', 'Nazirpur', 'Nesarabad', 'Zianagar'],
    upazilasBn: ['পিরোজপুর সদর', 'ভাণ্ডারিয়া', 'কাউখালী', 'মঠবাড়িয়া', 'নাজিরপুর', 'নেছারাবাদ', 'জিয়ানগর']
  },
  {
    district: 'Rajbari',
    districtBn: 'রাজবাড়ী',
    aliases: ['রাজবাড়ি', 'রাজবাড়ী'],
    upazilas: ['Rajbari Sadar', 'Baliakandi', 'Goalandaghat', 'Kalukhali', 'Pangsha'],
    upazilasBn: ['রাজবাড়ী সদর', 'বালিয়াকান্দি', 'গোয়ালন্দঘাট', 'কালুখালী', 'পাংশা']
  },
  {
    district: 'Rajshahi',
    districtBn: 'রাজশাহী',
    upazilas: ['Rajshahi Sadar', 'Bagha', 'Bagmara', 'Charghat', 'Durgapur', 'Godagari', 'Mohanpur', 'Paba', 'Puthia', 'Tanore'],
    upazilasBn: ['রাজশাহী সদর', 'বাঘা', 'বাগমারা', 'চারঘাট', 'দূর্গাপুর', 'গোদাগাড়ী', 'মোহনপুর', 'পবা', 'পুঠিয়া', 'তানোর']
  },
  {
    district: 'Rangamati',
    districtBn: 'রাঙ্গামাটি',
    aliases: ['রাঙামাটি', 'রাঙ্গামাটি'],
    upazilas: ['Rangamati Sadar', 'Bagaichhari', 'Barkal', 'Belaichhari', 'Juraichhari', 'Kaptai', 'Karnafuli', 'Langadu', 'Naniarchar', 'Rajasthali'],
    upazilasBn: ['রাঙ্গামাটি সদর', 'বাঘাইছড়ি', 'বরকল', 'বিলাইছড়ি', 'জুরাইছড়ি', 'কাপ্তাই', 'কর্ণফুলী', 'লংগদু', 'নানিয়ারচর', 'রাজস্থলী']
  },
  {
    district: 'Rangpur',
    districtBn: 'রংপুর',
    upazilas: ['Rangpur Sadar', 'Badarganj', 'Gangachhara', 'Kaunia', 'Mithapukur', 'Pirgachha', 'Pirganj', 'Taraganj'],
    upazilasBn: ['রংপুর সদর', 'বদরগঞ্জ', 'গঙ্গাচড়া', 'কাউনিয়া', 'মিঠাপুকুর', 'পীরগাছা', 'পীরগঞ্জ', 'তারাগঞ্জ']
  },
  {
    district: 'Satkhira',
    districtBn: 'সাতক্ষীরা',
    upazilas: ['Satkhira Sadar', 'Assasuni', 'Debhata', 'Kalaroa', 'Kaliganj', 'Shyamnagar', 'Tala'],
    upazilasBn: ['সাতক্ষীরা সদর', 'আশাশুনি', 'দেবহাটা', 'কলারোয়া', 'কালীগঞ্জ', 'শ্যামনগর', 'তালা']
  },
  {
    district: 'Shariatpur',
    districtBn: 'শরীয়তপুর',
    aliases: ['Shariatpur', 'শরীয়তপুর', 'শরীয়তপুর'],
    upazilas: ['Shariatpur Sadar', 'Bhedarganj', 'Damudya', 'Gosairhat', 'Naria', 'Zanjira'],
    upazilasBn: ['শরীয়তপুর সদর', 'ভেদরগঞ্জ', 'ডামুড্যা', 'গোসাইরহাট', 'নড়িয়া', 'জাজিরা']
  },
  {
    district: 'Sherpur',
    districtBn: 'শেরপুর',
    upazilas: ['Sherpur Sadar', 'Jhenaigati', 'Nakla', 'Nalitabari', 'Sreebordi'],
    upazilasBn: ['শেরপুর সদর', 'ঝিনাইগাতী', 'নকলা', 'নালিতাবাড়ী', 'শ্রীবরদী']
  },
  {
    district: 'Sirajganj',
    districtBn: 'সিরাজগঞ্জ',
    aliases: ['Sirajgonj', 'সিরাজগঞ্জ'],
    upazilas: ['Sirajganj Sadar', 'Belkuchi', 'Chauhali', 'Kamarkhanda', 'Kazipur', 'Raiganj', 'Shahjadpur', 'Tarash', 'Ullahpara'],
    upazilasBn: ['সিরাজগঞ্জ সদর', 'বেলকুচি', 'চৌহালী', 'কামারখন্দ', 'কাজীপুর', 'রায়গঞ্জ', 'শাহজাদপুর', 'তাড়াশ', 'উল্লাপাড়া']
  },
  {
    district: 'Sunamganj',
    districtBn: 'সুনামগঞ্জ',
    aliases: ['Sunamgonj', 'সুনামগঞ্জ'],
    upazilas: ['Sunamganj Sadar', 'Bishwamvarpur', 'Chhatak', 'Derai', 'Dharamapassa', 'Dowarabazar', 'Jagannathpur', 'Jamalganj', 'Shanthiganj', 'Sullah', 'Tahirpur'],
    upazilasBn: ['সুনামগঞ্জ সদর', 'বিশ্বম্ভরপুর', 'ছাতক', 'দিরাই', 'ধর্মপাশা', 'দোয়ারাবাজার', 'জগন্নাথপুর', 'জামালগঞ্জ', 'শান্তিগঞ্জ', 'শাল্লা', 'তাহিরপুর']
  },
  {
    district: 'Sylhet',
    districtBn: 'সিলেট',
    upazilas: ['Sylhet Sadar', 'Balaganj', 'Beanibazar', 'Bishwanath', 'Companiganj', 'Dakshin Surma', 'Fenchuganj', 'Golapganj', 'Gowainghat', 'Jaintiapur', 'Kanaighat', 'Osmani Nagar', 'Zakiganj'],
    upazilasBn: ['সিলেট সদর', 'বালাগঞ্জ', 'বিয়ানীবাজার', 'বিশ্বনাথ', 'কোম্পানীগঞ্জ', 'দক্ষিণ সুরমা', 'ফেঞ্চুগঞ্জ', 'গোলাপগঞ্জ', 'গোয়াইনঘাট', 'জৈন্তাপুর', 'কানাইঘাট', 'ওসমানীনগর', 'জকিগঞ্জ']
  },
  {
    district: 'Tangail',
    districtBn: 'টাঙ্গাইল',
    upazilas: ['Tangail Sadar', 'Basail', 'Bhuapur', 'Delduar', 'Dhanbari', 'Ghatail', 'Gopalpur', 'Kalihati', 'Madhupur', 'Mirzapur', 'Nagarpur', 'Sakhipur'],
    upazilasBn: ['টাঙ্গাইল সদর', 'বাসাইল', 'ভূঞাপুর', 'দেলদুয়ার', 'ধানবাড়ী', 'ঘাটাইল', 'গোপালপুর', 'কালিহাতী', 'মধুপুর', 'মির্জাপুর', 'নাগরপুর', 'সখিপুর']
  },
  {
    district: 'Thakurgaon',
    districtBn: 'ঠাকুরগাঁও',
    aliases: ['ঠাকুরগাও', 'ঠাকুরগাঁও'],
    upazilas: ['Thakurgaon Sadar', 'Baliadangi', 'Haripur', 'Pirganj', 'Ranisankail'],
    upazilasBn: ['ঠাকুরগাঁও সদর', 'বালিয়াডাঙ্গী', 'হরিপুর', 'পীরগঞ্জ', 'রাণীশংকৈল']
  }
];

/**
 * Normalizes text for loose comparison:
 * removes punctuation, collapses spaces, and turns into lower-case.
 */
export function normalizeGeoStr(str?: string | null): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[\(\)\[\]\{\}\-_',./\\+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Find District Data object by any English or Bengali name, bracketed label, or alias.
 */
export function findDistrictData(districtKey?: string | null): DistrictData | undefined {
  if (!districtKey) return undefined;
  
  // Strip bracketed text first if any, e.g. "বাগেরহাট (Bagerhat)" -> "বাগেরহাট", "Bagerhat"
  const raw = districtKey.trim();
  const insideMatch = raw.match(/\((.*?)\)/);
  const inside = insideMatch ? insideMatch[1].trim() : '';
  const outside = raw.replace(/\(.*?\)/g, '').trim();

  const target = normalizeGeoStr(raw);
  const targetOutside = normalizeGeoStr(outside);
  const targetInside = normalizeGeoStr(inside);

  return BANGLADESH_DISTRICTS.find((d) => {
    const en = normalizeGeoStr(d.district);
    const bn = normalizeGeoStr(d.districtBn);

    if (
      target === en ||
      target === bn ||
      targetOutside === en ||
      targetOutside === bn ||
      (targetInside && (targetInside === en || targetInside === bn))
    ) {
      return true;
    }

    if (d.aliases && d.aliases.some((a) => {
      const na = normalizeGeoStr(a);
      return (
        target === na ||
        targetOutside === na ||
        (targetInside && targetInside === na) ||
        target.includes(na) ||
        na.includes(targetOutside)
      );
    })) {
      return true;
    }

    if (
      (en && targetOutside && (en.includes(targetOutside) || targetOutside.includes(en))) ||
      (bn && targetOutside && (bn.includes(targetOutside) || targetOutside.includes(bn)))
    ) {
      return true;
    }

    return false;
  });
}

/**
 * Returns a list of Upazila items for a given district with Bengali and English names.
 */
export function getDistrictUpazilaItems(districtKey?: string | null): UpazilaItem[] {
  const dist = findDistrictData(districtKey);
  if (!dist || !dist.upazilas) return [];

  return dist.upazilas.map((uEn, idx) => {
    const uBn = (dist.upazilasBn && dist.upazilasBn[idx]) ? dist.upazilasBn[idx] : uEn;
    return {
      nameBn: uBn,
      nameEn: uEn,
      label: `${uBn} (${uEn})`
    };
  });
}

/**
 * Localizes location/district names (e.g. "ঢাকা (ডিফল্ট)" -> "Dhaka (Default)")
 */
export function formatLocationName(rawName: string | undefined | null, lang: 'bn' | 'en'): string {
  if (!rawName) return lang === 'bn' ? 'ঢাকা' : 'Dhaka';

  let str = rawName.trim();

  let suffixEn = '';
  let suffixBn = '';

  if (/\(ডিফল্ট\)|\(Default\)/i.test(str)) {
    suffixBn = ' (ডিফল্ট)';
    suffixEn = ' (Default)';
    str = str.replace(/\(ডিফল্ট\)|\(Default\)/gi, '').trim();
  } else if (/\(জি\.পি\.এস\)|\(GPS\)/i.test(str)) {
    suffixBn = ' (জি.পি.এস)';
    suffixEn = ' (GPS)';
    str = str.replace(/\(জি\.পি\.এস\)|\(GPS\)/gi, '').trim();
  } else if (/\(জেলা\)|\(District\)/i.test(str)) {
    suffixBn = ' (জেলা)';
    suffixEn = ' (District)';
    str = str.replace(/\(জেলা\)|\(District\)/gi, '').trim();
  } else if (/\(ম্যানুয়াল\)|\(Manual\)/i.test(str)) {
    suffixBn = ' (ম্যানুয়াল)';
    suffixEn = ' (Manual)';
    str = str.replace(/\(ম্যানুয়াল\)|\(Manual\)/gi, '').trim();
  }

  const suffix = lang === 'bn' ? suffixBn : suffixEn;

  const dist = findDistrictData(str);
  if (dist) {
    const name = lang === 'bn' ? dist.districtBn : dist.district;
    return `${name}${suffix}`;
  }

  if (normalizeGeoStr(str) === 'dhaka' || str === 'ঢাকা') {
    const name = lang === 'bn' ? 'ঢাকা' : 'Dhaka';
    return `${name}${suffix}`;
  }

  return `${str}${suffix}`;
}

/**
 * Checks if a location entity (Shop, Mosque, Order, User) matches a target district.
 * Inspects district field, address, area, upazila, etc.
 */
export function isLocationMatchingDistrict(
  item: {
    district?: string | null;
    upazila?: string | null;
    upazilaThana?: string | null;
    area?: string | null;
    address?: string | null;
    shopAddress?: string | null;
    locationAddress?: string | null;
    fullAddress?: string | null;
  },
  targetDistrict: string
): boolean {
  if (!targetDistrict) return true;
  const distData = findDistrictData(targetDistrict);

  // Build lookup words
  const wordsToMatch: string[] = [];
  if (distData) {
    wordsToMatch.push(distData.district.toLowerCase());
    wordsToMatch.push(distData.districtBn);
    if (distData.aliases) {
      distData.aliases.forEach((a) => wordsToMatch.push(a.toLowerCase()));
    }
  } else {
    wordsToMatch.push(targetDistrict.toLowerCase());
  }

  // 1. Direct district match
  const itemDist = normalizeGeoStr(item.district);
  if (itemDist) {
    for (const w of wordsToMatch) {
      const nw = normalizeGeoStr(w);
      if (itemDist === nw || itemDist.includes(nw) || nw.includes(itemDist)) {
        return true;
      }
    }
  }

  // 2. Address / Area / Full address string matching
  const combinedText = [
    item.district,
    item.upazila,
    item.upazilaThana,
    item.area,
    item.address,
    item.shopAddress,
    item.locationAddress,
    item.fullAddress
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  for (const w of wordsToMatch) {
    if (combinedText.includes(w.toLowerCase())) {
      return true;
    }
  }

  // 3. Upazila-based match: if the item's upazila belongs to this district
  if (distData && distData.upazilas && distData.upazilas.length > 0) {
    const itemUpazila = [item.upazila, item.upazilaThana, item.area].filter(Boolean).join(' ').toLowerCase();
    if (itemUpazila) {
      for (const up of distData.upazilas) {
        const cleanUp = up.toLowerCase().replace(/\s+sadar$/i, '').trim();
        if (cleanUp.length >= 3 && itemUpazila.includes(cleanUp)) {
          return true;
        }
      }
      if (distData.upazilasBn) {
        for (const upBn of distData.upazilasBn) {
          const cleanUpBn = upBn.replace(/\s+সদর$/i, '').trim();
          if (cleanUpBn.length >= 3 && itemUpazila.includes(cleanUpBn)) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

/**
 * Checks if a location entity matches a target upazila/thana.
 */
export function isLocationMatchingUpazila(
  item: {
    upazila?: string | null;
    upazilaThana?: string | null;
    area?: string | null;
    address?: string | null;
    shopAddress?: string | null;
    locationAddress?: string | null;
  },
  targetUpazila: string
): boolean {
  if (!targetUpazila) return true;
  const target = targetUpazila.toLowerCase().replace(/\s+(sadar|সদর)$/i, '').trim();
  if (!target) return true;

  const combined = [
    item.upazila,
    item.upazilaThana,
    item.area,
    item.address,
    item.shopAddress,
    item.locationAddress
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return combined.includes(target) || combined.includes(targetUpazila.toLowerCase());
}
