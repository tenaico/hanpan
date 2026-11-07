/**
 * The design templates' words outside Korean: each Korean text of templates.ts (template
 * names, document names, text boxes) with its English and Vietnamese. templatesFor puts
 * them in place; every other UI language reads the English. A Korean text missing here
 * fails tests/hanpan-design-i18n.test.ts.
 */
export const TEMPLATE_WORDS: Readonly<Record<string, { en: string; vi: string }>> = {
  '공공기관 안내문': { en: 'Public notice', vi: 'Thông báo công' },
  '○○구청 알림': {
    en: 'Greenfield District Office Notice',
    vi: 'Thông báo của UBND phường An Bình',
  },
  '제2026-047호': { en: 'No. 2026-047', vi: 'Số 2026-047' },
  '주민 설명회\n안내': { en: 'Residents’\nMeeting', vi: 'Thông báo\nhọp dân' },
  '2026 하반기 ○○동 생활권 계획을 주민 여러분과 함께 정합니다.': {
    en: 'Let’s shape Greenfield’s neighbourhood plan for late 2026 together.',
    vi: 'Cùng người dân xây dựng kế hoạch khu dân cư phường An Bình cuối năm 2026.',
  },
  금요일: { en: 'Friday', vi: 'Thứ Sáu' },
  '오후 2시부터\n4시까지': { en: 'From 2 pm\nto 4 pm', vi: 'Từ 14:00\nđến 16:00' },
  장소: { en: 'Venue', vi: 'Địa điểm' },
  '○○구청 3층 대회의실': {
    en: 'Main Meeting Room, 3F, District Office',
    vi: 'Phòng họp lớn, tầng 3, UBND phường',
  },
  대상: { en: 'Who', vi: 'Đối tượng' },
  '○○동 주민 누구나, 신청 없이 오시면 됩니다': {
    en: 'All Greenfield residents, no sign-up needed',
    vi: 'Mọi người dân phường An Bình, không cần đăng ký',
  },
  내용: { en: 'What', vi: 'Nội dung' },
  '생활권 계획안 설명과 질의응답': {
    en: 'The draft neighbourhood plan, then Q&A',
    vi: 'Giới thiệu dự thảo kế hoạch và hỏi đáp',
  },
  문의: { en: 'Contact', vi: 'Liên hệ' },
  '기획예산과 02-000-0000': {
    en: 'Planning & Budget  000-000-0000',
    vi: 'Phòng Kế hoạch – Ngân sách  000-000-0000',
  },
  '주차 공간이 부족하니 대중교통을 이용해 주세요.': {
    en: 'Parking is limited, so please use public transport.',
    vi: 'Chỗ đỗ xe có hạn, xin vui lòng đi phương tiện công cộng.',
  },
  '○○구청장': { en: 'The District Mayor', vi: 'UBND phường' },
  가정통신문: { en: 'Letter to parents', vi: 'Thư gửi phụ huynh' },
  '○○초등학교 가정통신문': {
    en: 'Greenfield Primary · Letter to parents',
    vi: 'Tiểu học An Bình · Thư gửi phụ huynh',
  },
  '제2026-000호': { en: 'No. 2026-000', vi: 'Số 2026-000' },
  '현장체험학습\n안내': { en: 'Field trip\nnotice', vi: 'Thông báo\ndã ngoại' },
  '11월': { en: 'November', vi: 'Tháng 11' },
  '학부모님, 안녕하십니까?\n가을이 깊어 가는 때, 가정에 건강과 행복이 가득하시기를 바랍니다.\n우리 학교는 아래와 같이 현장체험학습을 실시하오니 준비물을 살펴봐 주십시오.':
    {
      en: 'Dear parents,\nAs autumn deepens, we wish your family good health and happiness.\nOur school is holding a field trip as below; please check what your child needs to bring.',
      vi: 'Kính gửi Quý phụ huynh,\nTrong những ngày thu, kính chúc gia đình luôn mạnh khỏe và hạnh phúc.\nNhà trường tổ chức chuyến dã ngoại như sau, mong Quý phụ huynh xem kỹ đồ dùng cần mang.',
    },
  '알려 드립니다': { en: 'Details', vi: 'Thông tin chi tiết' },
  일시: { en: 'When', vi: 'Thời gian' },
  '11. 13.(금) 09:00 – 15:00': {
    en: 'Fri 13 Nov, 09:00 – 15:00',
    vi: 'Thứ Sáu, 13/11, 09:00 – 15:00',
  },
  '○○과학관 (학교 버스로 이동)': {
    en: 'Greenfield Science Museum (by school bus)',
    vi: 'Bảo tàng Khoa học An Bình (đi xe buýt của trường)',
  },
  준비물: { en: 'Bring', vi: 'Mang theo' },
  '도시락, 물, 필기도구': {
    en: 'Packed lunch, water, pen and notebook',
    vi: 'Cơm hộp, nước uống, bút và vở',
  },
  복장: { en: 'Wear', vi: 'Trang phục' },
  '활동하기 편한 옷과 운동화': {
    en: 'Comfortable clothes and trainers',
    vi: 'Quần áo thoải mái và giày thể thao',
  },
  '참가 동의서는 11. 6.(금)까지 담임 선생님께 보내 주세요.': {
    en: 'Please return the consent form to the class teacher by Fri 6 Nov.',
    vi: 'Vui lòng gửi giấy đồng ý cho giáo viên chủ nhiệm trước Thứ Sáu, 6/11.',
  },
  '○○초등학교장': { en: 'Head Teacher', vi: 'Hiệu trưởng' },
  '- - - - - - - - - - - - - - - - - - - -   자르는 곳   - - - - - - - - - - - - - - - - - - - -': {
    en: '- - - - - - - - - - - - - - - - - - - -   cut here   - - - - - - - - - - - - - - - - - - - -',
    vi: '- - - - - - - - - - - - - - - - - - -   cắt tại đây   - - - - - - - - - - - - - - - - - - -',
  },
  '참가 동의서': { en: 'Consent form', vi: 'Giấy đồng ý' },
  '        학년        반   이름                     \n위 학생의 현장체험학습 참가에 동의합니다.     보호자                    (인)':
    {
      en: 'Year        Class        Name                     \nI agree to my child joining the field trip.     Parent/guardian                    (signed)',
      vi: 'Khối        Lớp        Họ tên                     \nTôi đồng ý cho con tham gia chuyến dã ngoại.     Phụ huynh                    (ký tên)',
    },
  '행사 포스터': { en: 'Event poster', vi: 'Áp phích sự kiện' },
  '주최 ○○기관': { en: 'Hosted by Greenfield Agency', vi: 'Tổ chức: Viện An Bình' },
  '와 함께하는\n문서 혁신 포럼': {
    en: 'presents the\nDocument Forum',
    vi: 'tổ chức\nDiễn đàn văn bản',
  },
  '일하는 방식을 바꾸는 오후, 세 번의 발표와 한 번의 토론': {
    en: 'An afternoon that changes how we work: three talks and one debate',
    vi: 'Một buổi chiều đổi mới cách làm việc: ba bài trình bày, một phiên thảo luận',
  },
  '기조 발표   김○○ 교수': {
    en: 'Keynote   Prof. Jamie Lee',
    vi: 'Phát biểu chính   GS. Nguyễn Minh An',
  },
  '현장 사례   이○○ 대표': {
    en: 'Case study   Sam Park, CEO',
    vi: 'Thực tiễn   Trần Thu Hà, Giám đốc',
  },
  '도구 시연   박○○ 연구원': {
    en: 'Live demo   Alex Chen, researcher',
    vi: 'Trình diễn   Lê Quang Huy, nghiên cứu viên',
  },
  '함께 토론': { en: 'Open discussion', vi: 'Thảo luận chung' },
  '12. 3.(목) 14:00 – 17:00': {
    en: 'Thu 3 Dec, 14:00 – 17:00',
    vi: 'Thứ Năm, 3/12, 14:00 – 17:00',
  },
  '○○컨벤션센터 3층 그랜드홀': {
    en: 'Grand Hall, 3F, Greenfield Convention Centre',
    vi: 'Grand Hall, tầng 3, Trung tâm Hội nghị An Bình',
  },
  '카드뉴스 표지': { en: 'Card news cover', vi: 'Bìa tin ảnh' },
  카드뉴스: { en: 'Card news', vi: 'Tin ảnh' },
  '업무 글쓰기': { en: 'Writing at work', vi: 'Viết ở công sở' },
  '공문서\n작성 규칙': { en: 'Official\nwriting', vi: 'Quy tắc\nvăn bản' },
  '헷갈리기 쉬운\n다섯 가지만 골랐습니다': {
    en: 'Just the five points\npeople mix up most',
    vi: 'Năm điểm\ndễ nhầm nhất',
  },
  '한판 디자인': { en: 'Hanpan Design', vi: 'Hanpan Design' },
  '넘겨 보기': { en: 'Swipe', vi: 'Lướt xem' },
  '유튜브 썸네일': { en: 'YouTube thumbnail', vi: 'Ảnh bìa YouTube' },
  썸네일: { en: 'Thumbnail', vi: 'Ảnh bìa' },
  '3분 정리': { en: 'In 3 min', vi: '3 phút' },
  마인드맵으로: { en: 'Mind map', vi: 'Sơ đồ tư duy' },
  '보고서 끝!': { en: 'to report!', vi: 'ra báo cáo!' },
  '회의 메모가 보고서가 되기까지': {
    en: 'From meeting notes to a finished report',
    vi: 'Từ ghi chú cuộc họp đến báo cáo hoàn chỉnh',
  },
  '한판 사용법': { en: 'How to use Hanpan', vi: 'Cách dùng Hanpan' },
  '할인 배너': { en: 'Sale banner', vi: 'Banner giảm giá' },
  최대: { en: 'Up to', vi: 'Giảm đến' },
  '12. 1.(월) – 12. 7.(일)': { en: 'Mon 1 Dec – Sun 7 Dec', vi: 'Thứ Hai 1/12 – Chủ Nhật 7/12' },
  '전 품목, 3만 원 이상 무료 배송': {
    en: 'All items · free delivery over $30',
    vi: 'Mọi mặt hàng · miễn phí giao từ 300.000đ',
  },
  '○○스토어': { en: 'Maple Store', vi: 'Shop An Bình' },
  '세미나 초대장': { en: 'Seminar invitation', vi: 'Thư mời hội thảo' },
  '디지털 전환\n정책 세미나': {
    en: 'Digital Shift\nPolicy Seminar',
    vi: 'Hội thảo\nchuyển đổi số',
  },
  '공공 서비스의 내일을 함께 그립니다': {
    en: 'Picturing tomorrow’s public services together',
    vi: 'Cùng phác họa tương lai của dịch vụ công',
  },
  '귀하를 아래 세미나에 정중히 초대합니다.\n바쁘시더라도 참석하시어 자리를 빛내 주시기 바랍니다.': {
    en: 'You are cordially invited to the seminar below.\nWe would be honoured by your presence.',
    vi: 'Trân trọng kính mời Quý vị tham dự hội thảo dưới đây.\nSự hiện diện của Quý vị là niềm vinh hạnh cho chúng tôi.',
  },
  '2026. 11. 27.(목)\n오후 2시': { en: 'Thu 27 Nov 2026\n2 pm', vi: 'Thứ Năm 27/11/2026\n14:00' },
  '○○호텔\n그랜드볼룸': {
    en: 'Greenfield Hotel\nGrand Ballroom',
    vi: 'KS An Bình\nSảnh chính',
  },
  회신: { en: 'RSVP', vi: 'Phản hồi' },
  '11. 20.(목)까지': { en: 'By Thu 20 Nov', vi: 'Trước ngày 20/11' },
  '한국○○연구원장': {
    en: 'Greenfield Institute',
    vi: 'Viện Nghiên cứu An Bình',
  },
  '문의 02-000-0000   seminar@example.kr': {
    en: 'Contact 000-000-0000   seminar@example.com',
    vi: 'Liên hệ 000-000-0000   seminar@example.vn',
  },
  '인용 카드': { en: 'Quote card', vi: 'Thẻ trích dẫn' },
  '작은 기록이 모여\n큰 변화를\n만듭니다.': {
    en: 'Small notes\nadd up to\nbig change.',
    vi: 'Ghi chép nhỏ\ntạo nên\nthay đổi lớn.',
  },
  '오늘의 문장': { en: 'Quote of the day', vi: 'Câu nói hôm nay' },
  '모집 공고': { en: 'Recruitment notice', vi: 'Thông báo tuyển' },
  '○○시 청년센터': { en: 'Greenfield Youth Centre', vi: 'Trung tâm Thanh niên An Bình' },
  '청년 서포터즈\n모집합니다': {
    en: 'Youth Supporters\nwanted',
    vi: 'Tuyển cộng tác viên\nthanh niên',
  },
  '지역의 이야기를 함께 기록할\n스무 명의 청년을 찾습니다': {
    en: 'We need twenty young people\nto tell local stories with us',
    vi: 'Tìm 20 bạn trẻ cùng\nghi lại chuyện địa phương',
  },
  '3기': { en: '3rd', vi: 'K3' },
  '모집 기간': { en: 'Apply by', vi: 'Thời hạn' },
  '모집 인원': { en: 'Places', vi: 'Số lượng' },
  '20명 내외': { en: 'About 20', vi: 'Khoảng 20 bạn' },
  '활동 내용': { en: 'Activities', vi: 'Hoạt động' },
  '지역 소식 취재, 카드뉴스 제작': {
    en: 'Reporting local news, making card news',
    vi: 'Đưa tin địa phương, làm bản tin hình ảnh',
  },
  혜택: { en: 'Perks', vi: 'Quyền lợi' },
  '활동비 지원, 수료증 발급': {
    en: 'Activity allowance and a certificate',
    vi: 'Hỗ trợ chi phí, cấp giấy chứng nhận',
  },
  지원하기: { en: 'Apply', vi: 'Đăng ký' },
  '주관 ○○시 청년센터   문의 02-000-0000': {
    en: 'Run by Greenfield Youth Centre   Contact 000-000-0000',
    vi: 'Tổ chức: Trung tâm Thanh niên An Bình   Liên hệ 000-000-0000',
  },
  '이벤트 스토리': { en: 'Event story', vi: 'Story sự kiện' },
  '가을맞이\n팔로우\n이벤트': { en: 'Autumn\nFollow\nGiveaway', vi: 'Mùa thu\ntheo dõi\nnhận quà' },
  '참여만 해도 추첨으로 서른 분께 선물을 드려요': {
    en: 'Join in and 30 lucky winners get a gift',
    vi: 'Chỉ cần tham gia, 30 bạn may mắn sẽ nhận quà',
  },
  '계정 팔로우하기': { en: 'Follow our account', vi: 'Theo dõi trang' },
  '게시물에 친구 태그하기': { en: 'Tag a friend in the post', vi: 'Gắn thẻ bạn bè dưới bài' },
  '이 이야기 공유하기': { en: 'Share this story', vi: 'Chia sẻ story này' },
  '11. 30.(일)까지   당첨 발표 12. 3.': {
    en: 'Until Sun 30 Nov   Winners on 3 Dec',
    vi: 'Đến hết 30/11   Công bố: 3/12',
  },
  '발표 표지': { en: 'Slide cover', vi: 'Bìa thuyết trình' },
  '2026 하반기 업무 보고': { en: 'H2 2026 work report', vi: 'Báo cáo công tác cuối năm 2026' },
  '데이터로 보는\n우리 기관의 1년': { en: 'Our year\nin data', vi: 'Một năm\nqua số liệu' },
  '기획예산팀 김○○': { en: 'Jamie Lee, Planning & Budget', vi: 'Nguyễn Văn An, Phòng Kế hoạch' },
  상장: { en: 'Certificate of Award', vi: 'Giấy khen' },
  '제 2026-001 호': { en: 'No. 2026-001', vi: 'Số 2026-001' },
  '상    장': { en: 'Certificate', vi: 'GIẤY KHEN' },
  '독서 우수상': { en: 'Award for Excellent Reading', vi: 'Giải Đọc sách xuất sắc' },
  '○○초등학교 6학년 2반': {
    en: 'Class 6-2, Greenfield Primary School',
    vi: 'Lớp 5A, Trường Tiểu học An Bình',
  },
  '홍 길 동': { en: 'Jamie Green', vi: 'Nguyễn Văn An' },
  '위 학생은 평소 성실한 태도로 학교생활에 임하며\n바른 독서 습관을 길러 다른 학생의 모범이 되었기에\n이 상장을 주어 칭찬합니다.':
    {
      en: 'This student has worked diligently at school\nand built fine reading habits, a model to others.\nWe present this certificate in recognition.',
      vi: 'Em đã chăm chỉ, nghiêm túc trong học tập\nvà có thói quen đọc sách tốt, là tấm gương cho bạn bè.\nNhà trường trao giấy khen này để biểu dương.',
    },
  '2026년 12월 20일': { en: '20 December 2026', vi: 'Ngày 20 tháng 12 năm 2026' },
  '○○초등\n학교장인': { en: 'School\nSeal', vi: 'Dấu\nTrường' },
  '카드뉴스 본문': { en: 'Card news page', vi: 'Trang tin ảnh' },
  '보고서는\n결론부터 씁니다': {
    en: 'Start reports\nwith the conclusion',
    vi: 'Báo cáo:\nviết kết luận trước',
  },
  '첫 문단': { en: 'Opening', vi: 'Mở đầu' },
  '결론과 요청을 먼저 씁니다': {
    en: 'State the conclusion and the ask first',
    vi: 'Nêu kết luận và đề xuất trước',
  },
  근거: { en: 'Evidence', vi: 'Căn cứ' },
  '숫자로, 세 가지만 듭니다': { en: 'Three points, in numbers', vi: 'Ba ý, bằng con số' },
  '끝 문단': { en: 'Closing', vi: 'Kết bài' },
  '다음에 할 일과 기한을 적습니다': {
    en: 'Next steps and deadlines',
    vi: 'Việc tiếp theo và thời hạn',
  },
  '개업 안내': { en: 'Grand opening', vi: 'Khai trương' },
  '12. 5.(금) 오전 10시': { en: 'Fri 5 Dec, 10 am', vi: '10 giờ sáng Thứ Sáu, 5/12' },
  '카페 ○○이 문을 엽니다': { en: 'Café Maple is opening', vi: 'Cà phê An Nhiên khai trương' },
  '첫 주 음료\n1+1': { en: 'First-week drinks\n1+1', vi: 'Đồ uống tuần đầu\nmua 1 tặng 1' },
  '스탬프\n2배 적립': { en: 'Double\nstamps', vi: 'Tích điểm\ngấp đôi' },
  '선착순 100명\n머그컵 증정': {
    en: 'Free mug for\nthe first 100',
    vi: 'Tặng cốc cho\n100 khách đầu',
  },
  '○○시 ○○로 123, ○○역 2번 출구에서 3분': {
    en: '123 Maple Road, 3 min from Greenfield Station exit 2',
    vi: '123 đường An Bình, cách lối ra số 2 ga An Bình 3 phút',
  },
  '매일 09:00 – 22:00': { en: 'Daily 09:00 – 22:00', vi: 'Hằng ngày 09:00 – 22:00' },
  메뉴판: { en: 'Menu', vi: 'Thực đơn' },
  '카페 ○○': { en: 'Café Maple', vi: 'Cà phê An Nhiên' },
  아메리카노: { en: 'Americano', vi: 'Americano' },
  '산미가 적은 블렌드, 따뜻하게 또는 차갑게': {
    en: 'Low-acid blend, hot or iced',
    vi: 'Hạt rang ít chua, nóng hoặc đá',
  },
  '카페 라테': { en: 'Café latte', vi: 'Latte' },
  '우유를 곱게 데워 부드럽게': {
    en: 'Gently steamed milk, smooth and soft',
    vi: 'Sữa đánh nóng mịn, vị êm',
  },
  '바닐라 라테': { en: 'Vanilla latte', vi: 'Latte vani' },
  '직접 끓인 바닐라 시럽': { en: 'House-made vanilla syrup', vi: 'Siro vani tự nấu' },
  콜드브루: { en: 'Cold brew', vi: 'Cold brew' },
  '열두 시간 내린 이 집의 대표 메뉴': {
    en: 'Steeped for 12 hours, our signature',
    vi: 'Ủ lạnh 12 tiếng, món đặc trưng của quán',
  },
  대표: { en: 'Best', vi: 'Hot' },
  치즈케이크: { en: 'Cheesecake', vi: 'Bánh phô mai' },
  '매일 아침 굽는 바스크 치즈케이크': {
    en: 'Basque cheesecake, baked every morning',
    vi: 'Bánh phô mai Basque nướng mỗi sáng',
  },
  크로플: { en: 'Croffle', vi: 'Croffle' },
  '버터 크루아상 반죽을 와플 틀에': {
    en: 'Butter croissant dough in a waffle iron',
    vi: 'Bột croissant bơ nướng khuôn waffle',
  },
  마들렌: { en: 'Madeleines', vi: 'Bánh madeleine' },
  '레몬 마들렌, 두 개': { en: 'Lemon madeleines, two', vi: 'Madeleine chanh, 2 chiếc' },
  '매일 09:00 – 21:00': { en: 'Daily 09:00 – 21:00', vi: 'Hằng ngày 09:00 – 21:00' },
  '봉사자 모집': { en: 'Volunteers wanted', vi: 'Tuyển tình nguyện viên' },
  함께해요: { en: 'Join us', vi: 'Cùng tham gia' },
  '이웃과 함께하는 걷기 정화': {
    en: 'A clean-up walk with neighbours',
    vi: 'Đi bộ nhặt rác cùng hàng xóm',
  },
  '주말 환경 정화\n봉사자를\n찾습니다': {
    en: 'Weekend clean-up\nvolunteers\nwanted',
    vi: 'Tình nguyện\ndọn rác\ncuối tuần',
  },
  '매월 둘째 토요일 오전 10시': {
    en: '2nd Saturday of every month, 10 am',
    vi: '10 giờ sáng thứ Bảy tuần thứ 2 mỗi tháng',
  },
  '○○천 산책로 입구': {
    en: 'Greenfield Stream trail entrance',
    vi: 'Lối vào đường dạo bờ kênh An Bình',
  },
  '누구나, 장갑과 집게를 드립니다': {
    en: 'Everyone welcome; gloves and grabbers provided',
    vi: 'Ai cũng tham gia được, có sẵn găng tay và kẹp gắp',
  },
  신청하기: { en: 'Sign up', vi: 'Đăng ký' },
  '강의 썸네일': { en: 'Class thumbnail', vi: 'Ảnh bìa khóa học' },
  '무료 온라인 강의': { en: 'Free online class', vi: 'Khóa học online miễn phí' },
  '엑셀 자동화\n30분 만에\n끝내기': {
    en: 'Automate\nExcel in\n30 minutes',
    vi: 'Tự động hóa\nExcel\ntrong 30 phút',
  },
  '11. 21.(금) 저녁 8시': { en: 'Fri 21 Nov, 8 pm', vi: '20:00 Thứ Sáu, 21/11' },
  '강사 김○○': { en: 'Tutor: Jamie Lee', vi: 'Giảng viên: Nguyễn Văn An' },
  '숫자 강조 발표': { en: 'Key figures slide', vi: 'Slide số liệu' },
  '핵심 성과': { en: 'Key results', vi: 'Kết quả nổi bật' },
  '민원 처리 기간이 절반으로 줄었습니다': {
    en: 'Request handling time has halved',
    vi: 'Thời gian giải quyết hồ sơ giảm một nửa',
  },
  '평균 민원 처리 기간, 2025년과 견주어': {
    en: 'Average handling time, compared with 2025',
    vi: 'Thời gian xử lý trung bình, so với năm 2025',
  },
  '만족도 (5점 만점)': { en: 'Satisfaction (out of 5)', vi: 'Mức hài lòng (thang 5)' },
  '온라인 신청 증가': { en: 'Rise in online applications', vi: 'Hồ sơ trực tuyến tăng' },
  '자료: 2026 ○○기관 업무 통계': {
    en: 'Source: Greenfield Agency statistics 2026',
    vi: 'Nguồn: Thống kê 2026 của Sở An Bình',
  },
  '감사 카드': { en: 'Thank-you card', vi: 'Thiệp cảm ơn' },
  '늘 곁에서 힘이 되어 주셔서\n고맙습니다': {
    en: 'Thank you for always\nbeing there for me',
    vi: 'Cảm ơn vì đã luôn\nở bên và tiếp sức',
  },
  '○○ 드림': { en: 'From Jamie', vi: 'An gửi' },
  '안전 수칙': { en: 'Safety tips', vi: 'Quy tắc an toàn' },
  '겨울철\n안전 수칙': { en: 'Winter\nsafety tips', vi: 'An toàn\nmùa đông' },
  '눈과 빙판길, 화재에 미리 대비해 주세요.': {
    en: 'Get ready early for snow, ice and fire.',
    vi: 'Hãy chủ động phòng tránh băng tuyết và hỏa hoạn.',
  },
  '빙판길은 천천히': { en: 'Go slow on ice', vi: 'Đi chậm trên đường trơn' },
  '주머니에서 손을 빼고 보폭을 줄여 걷습니다.': {
    en: 'Keep hands out of pockets and take short steps.',
    vi: 'Bỏ tay khỏi túi áo và bước ngắn khi đi.',
  },
  '난방기 곁을 비우지 않기': {
    en: 'Never leave heaters unattended',
    vi: 'Không để máy sưởi chạy khi vắng người',
  },
  '외출할 때는 전원을 끄고 플러그를 뽑습니다.': {
    en: 'Switch off and unplug before you go out.',
    vi: 'Tắt nguồn và rút phích cắm khi ra ngoài.',
  },
  '차량 월동 준비': { en: 'Get your car winter-ready', vi: 'Chuẩn bị xe cho mùa lạnh' },
  '타이어와 배터리, 부동액을 미리 점검합니다.': {
    en: 'Check tyres, battery and antifreeze early.',
    vi: 'Kiểm tra trước lốp, ắc quy và nước làm mát.',
  },
  '위급할 때는': { en: 'In an emergency', vi: 'Khi khẩn cấp' },
  '다친 사람이 있으면 먼저 119에 알립니다': {
    en: 'If anyone is hurt, call emergency services first',
    vi: 'Có người bị thương, gọi ngay 115',
  },
  '○○시청 안전총괄과': {
    en: 'Safety Division, Greenfield City Hall',
    vi: 'Ban An toàn, UBND phường An Bình',
  },
}
