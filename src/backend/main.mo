import Array "mo:core/Array";
import Int "mo:core/Int";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Order "mo:core/Order";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Text "mo:core/Text";
import Time "mo:core/Time";
import MixinAuthorization "authorization/MixinAuthorization";
import MixinStorage "blob-storage/Mixin";
import AccessControl "authorization/access-control";



actor {
  include MixinStorage();
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  public type UserProfile = { name : Text };
  let userProfiles = Map.empty<Principal, UserProfile>();

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) { Runtime.trap("Unauthorized") };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) { Runtime.trap("Unauthorized") };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) { Runtime.trap("Unauthorized") };
    userProfiles.add(caller, profile);
  };

  type Room = {
    id : Nat;
    title : Text;
    slug : Text;
    description : Text;
    price : Text;
    thumbnailUrl : Text;
    videoUrl : Text;
    embedScript : Text;
    createdAt : Time.Time;
    viewDuration : Text;
    category : Text;
    creatorName : Text;
  };

  module Room {
    public func compare(room1 : Room, room2 : Room) : Order.Order {
      Int.compare(room2.createdAt, room1.createdAt);
    };
  };

  // Stable storage for rooms — survives canister upgrades
  stable var _stableRooms : [Room] = [];
  stable var nextRoomId : Nat = 1;

  // Stable storage for room sort orders: [(roomId, sortOrder)]
  // Rooms not in this list fall back to createdAt-descending order.
  stable var _roomSortOrders : [(Nat, Nat)] = [];

  let rooms = Map.empty<Nat, Room>();

  func getRoomSortOrder(id : Nat) : Nat {
    let found = _roomSortOrders.vals().find(func((k, _v) : (Nat, Nat)) : Bool { k == id });
    switch (found) {
      case (?(_, order)) order;
      case null 2_000_000_000; // large fallback — unordered rooms sort last
    };
  };

  func setRoomSortOrder(id : Nat, order : Nat) : () {
    let filtered = _roomSortOrders.vals()
      .filter(func((k, _v) : (Nat, Nat)) : Bool { k != id })
      .toArray();
    let size = filtered.size();
    _roomSortOrders := Array.tabulate<(Nat, Nat)>(size + 1, func(i : Nat) : (Nat, Nat) {
      if (i < size) { filtered[i] } else { (id, order) };
    });
  };

  type VideoSubmission = {
    id : Nat;
    submitterPrincipal : Principal;
    title : Text;
    description : Text;
    videoUrl : Text;
    thumbnailUrl : Text;
    paymentAddress : Text;
    price : Text;
    category : Text;
    viewDuration : Text;
    creatorName : Text;
    status : Text;
    createdAt : Time.Time;
  };

  type VideoSubmissionFull = {
    id : Nat;
    submitterPrincipal : Principal;
    title : Text;
    description : Text;
    videoUrl : Text;
    thumbnailUrl : Text;
    paymentAddress : Text;
    price : Text;
    category : Text;
    viewDuration : Text;
    creatorName : Text;
    status : Text;
    createdAt : Time.Time;
    denialReason : Text;
  };

  stable var _stableSubmissions : [VideoSubmission] = [];
  stable var nextSubmissionId : Nat = 1;

  let pendingSubmissions = Map.empty<Nat, VideoSubmission>();

  stable var _denialReasons : [(Nat, Text)] = [];

  func getDenialReason(id : Nat) : Text {
    let found = _denialReasons.vals().find(func((k, _v) : (Nat, Text)) : Bool { k == id });
    switch (found) {
      case (?(_, reason)) reason;
      case null "";
    };
  };

  func setDenialReason(id : Nat, reason : Text) : () {
    let filtered = _denialReasons.vals()
      .filter(func((k, _v) : (Nat, Text)) : Bool { k != id })
      .toArray();
    let size = filtered.size();
    _denialReasons := Array.tabulate<(Nat, Text)>(size + 1, func(i : Nat) : (Nat, Text) {
      if (i < size) { filtered[i] } else { (id, reason) };
    });
  };

  func toFull(sub : VideoSubmission) : VideoSubmissionFull {
    {
      id = sub.id;
      submitterPrincipal = sub.submitterPrincipal;
      title = sub.title;
      description = sub.description;
      videoUrl = sub.videoUrl;
      thumbnailUrl = sub.thumbnailUrl;
      paymentAddress = sub.paymentAddress;
      price = sub.price;
      category = sub.category;
      viewDuration = sub.viewDuration;
      creatorName = sub.creatorName;
      status = sub.status;
      createdAt = sub.createdAt;
      denialReason = getDenialReason(sub.id);
    };
  };

  // ── Homepage Scripts ──────────────────────────────────────────────────────
  type HomepageScript = {
    id : Nat;
    name : Text;
    scriptContent : Text;
    order : Nat;
  };

  stable var _stableScripts : [HomepageScript] = [];
  stable var nextScriptId : Nat = 1;

  let homepageScripts = Map.empty<Nat, HomepageScript>();

  // ── Admin bootstrap stable state ─────────────────────────────────────────
  let hardcodedAdminTexts : [Text] = [
    "xcrfe-n64wj-5ec52-kpr3q-h5yft-ovyo6-4bjso-ubj2v-qe3uo-tm3ie-aqe",
    "dmqpn-7duh5-66nau-irxp2-tqm3o-ahcdq-36tps-krdf3-wwjiu-33hdf-mae",
  ];

  stable var dynamicAdmins : [Principal] = [];
  stable var firstAdminClaimed : Bool = false;

  func seedAdmin(p : Principal) {
    accessControlState.userRoles.add(p, #admin);
    accessControlState.adminAssigned := true;
  };

  // ── Upgrade hooks ─────────────────────────────────────────────────────────
  system func preupgrade() {
    _stableRooms := rooms.values().toArray();
    _stableSubmissions := pendingSubmissions.values().toArray();
    _stableScripts := homepageScripts.values().toArray();
  };

  system func postupgrade() {
    for (room in _stableRooms.vals()) {
      rooms.add(room.id, room);
    };
    for (sub in _stableSubmissions.vals()) {
      pendingSubmissions.add(sub.id, sub);
    };
    for (script in _stableScripts.vals()) {
      homepageScripts.add(script.id, script);
    };
    _stableRooms := [];
    _stableSubmissions := [];
    _stableScripts := [];
    for (t in hardcodedAdminTexts.vals()) {
      let p = Principal.fromText(t);
      seedAdmin(p);
    };
    for (p in dynamicAdmins.vals()) {
      seedAdmin(p);
    };
    if (hardcodedAdminTexts.size() > 0) {
      firstAdminClaimed := true;
    };
  };

  public query func getHomepageScripts() : async [HomepageScript] {
    let arr = homepageScripts.values().toArray();
    arr.sort(func(a : HomepageScript, b : HomepageScript) : Order.Order {
      Nat.compare(a.order, b.order);
    });
  };

  public shared ({ caller }) func addHomepageScript(name : Text, scriptContent : Text) : async HomepageScript {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admin can manage homepage scripts");
    };
    let id = nextScriptId;
    nextScriptId += 1;
    var maxOrder : Nat = 0;
    for (s in homepageScripts.values()) {
      if (s.order > maxOrder) { maxOrder := s.order };
    };
    let script : HomepageScript = { id; name; scriptContent; order = maxOrder + 1 };
    homepageScripts.add(id, script);
    script;
  };

  public shared ({ caller }) func updateHomepageScript(id : Nat, name : Text, scriptContent : Text) : async HomepageScript {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admin can manage homepage scripts");
    };
    switch (homepageScripts.get(id)) {
      case null { Runtime.trap("Script not found") };
      case (?existing) {
        let updated : HomepageScript = { existing with name; scriptContent };
        homepageScripts.add(id, updated);
        updated;
      };
    };
  };

  public shared ({ caller }) func removeHomepageScript(id : Nat) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admin can manage homepage scripts");
    };
    let existed = homepageScripts.containsKey(id);
    homepageScripts.remove(id);
    existed;
  };

  public shared ({ caller }) func reorderHomepageScripts(ids : [Nat]) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admin can manage homepage scripts");
    };
    var idx = 1;
    for (id in ids.vals()) {
      switch (homepageScripts.get(id)) {
        case null {};
        case (?s) {
          homepageScripts.add(id, { s with order = idx });
          idx += 1;
        };
      };
    };
  };

  // ── Admin bootstrap ───────────────────────────────────────────────────────
  public shared ({ caller }) func bootstrapAdminIfNeeded() : async Bool {
    if (caller.isAnonymous()) { return false };
    let callerText = caller.toText();
    let isHardcoded = hardcodedAdminTexts.vals().find(func(t : Text) : Bool { t == callerText }) != null;
    if (isHardcoded) {
      seedAdmin(caller);
      return true;
    };
    if (not firstAdminClaimed and dynamicAdmins.size() == 0) {
      let prev = dynamicAdmins; dynamicAdmins := Array.tabulate<Principal>(prev.size() + 1, func(i : Nat) : Principal { if (i < prev.size()) { prev[i] } else { caller } });
      firstAdminClaimed := true;
      seedAdmin(caller);
      return true;
    };
    let isDynamic = dynamicAdmins.vals().find(func(p : Principal) : Bool { p == caller }) != null;
    if (isDynamic) {
      seedAdmin(caller);
      return true;
    };
    false;
  };

  public query func hasDynamicAdmin() : async Bool {
    dynamicAdmins.size() > 0;
  };

  public query func hasAdmin() : async Bool {
    dynamicAdmins.size() > 0 or hardcodedAdminTexts.size() > 0;
  };

  public query ({ caller }) func isAdmin() : async Bool {
    AccessControl.isAdmin(accessControlState, caller);
  };

  // ─────────────────────────────────────────────────────────────────────────
  public shared ({ caller }) func createRoom(
    title : Text,
    _slug : Text,
    description : Text,
    price : Text,
    thumbnailUrl : Text,
    videoUrl : Text,
    embedScript : Text,
    viewDuration : Text,
    category : Text,
    creatorName : Text,
  ) : async Room {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admin can create rooms");
    };

    let roomId = nextRoomId;
    nextRoomId += 1;

    // Shift all existing rooms' order by +1 when adding new room at the top
    _roomSortOrders := _roomSortOrders.vals().map<(Nat, Nat), (Nat, Nat)>(func((k, v)) { (k, v + 1) }).toArray();

    let newRoom : Room = {
      id = roomId;
      title;
      slug = makeUniqueSlug(title);
      description;
      price;
      thumbnailUrl;
      videoUrl;
      embedScript;
      createdAt = Time.now();
      viewDuration;
      category;
      creatorName;
    };
    rooms.add(roomId, newRoom);

    setRoomSortOrder(roomId, 1);
    newRoom;
  };

  public shared ({ caller }) func updateRoom(
    id : Nat,
    title : Text,
    slug : Text,
    description : Text,
    price : Text,
    thumbnailUrl : Text,
    videoUrl : Text,
    embedScript : Text,
    viewDuration : Text,
    category : Text,
    creatorName : Text,
  ) : async Room {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admin can update rooms");
    };
    switch (rooms.get(id)) {
      case (null) { Runtime.trap("Room not found") };
      case (?existingRoom) {
        let updatedRoom : Room = {
          id;
          title;
          slug;
          description;
          price;
          thumbnailUrl;
          videoUrl;
          embedScript;
          createdAt = existingRoom.createdAt;
          viewDuration;
          category;
          creatorName;
        };
        rooms.add(id, updatedRoom);
        updatedRoom;
      };
    };
  };

  public shared ({ caller }) func deleteRoom(id : Nat) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) { Runtime.trap("Unauthorized") };
    let existed = rooms.containsKey(id);
    rooms.remove(id);
    _roomSortOrders := _roomSortOrders.vals()
      .filter(func((k, _v) : (Nat, Nat)) : Bool { k != id })
      .toArray();
    existed;
  };

  public query func getRooms() : async [Room] {
    let arr = rooms.values().toArray();
    arr.sort(func(r1 : Room, r2 : Room) : Order.Order {
      let o1 = _roomSortOrders.vals().find(func((k, _v) : (Nat, Nat)) : Bool { k == r1.id });
      let o2 = _roomSortOrders.vals().find(func((k, _v) : (Nat, Nat)) : Bool { k == r2.id });
      let order1 : Nat = switch (o1) { case (?(_, v)) v; case null 2_000_000_000 };
      let order2 : Nat = switch (o2) { case (?(_, v)) v; case null 2_000_000_000 };
      if (order1 < order2) #less
      else if (order1 > order2) #greater
      else Int.compare(r2.createdAt, r1.createdAt) // tiebreaker: newer first
    });
  };

  public query func getRoomById(id : Nat) : async ?Room {
    rooms.get(id);
  };

  public query func getRoomBySlug(slug : Text) : async ?Room {
    rooms.values().find(func(room) { room.slug == slug });
  };

  public shared ({ caller }) func moveRoomToTop(id : Nat) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admin can reorder rooms");
    };
    if (not rooms.containsKey(id)) { return false };

    let allRooms = rooms.values().toArray();
    let sorted = allRooms.sort(func(r1 : Room, r2 : Room) : Order.Order {
      let o1 = _roomSortOrders.vals().find(func((k, _v) : (Nat, Nat)) : Bool { k == r1.id });
      let o2 = _roomSortOrders.vals().find(func((k, _v) : (Nat, Nat)) : Bool { k == r2.id });
      let order1 : Nat = switch (o1) { case (?(_, v)) v; case null 2_000_000_000 };
      let order2 : Nat = switch (o2) { case (?(_, v)) v; case null 2_000_000_000 };
      if (order1 < order2) #less
      else if (order1 > order2) #greater
      else Int.compare(r2.createdAt, r1.createdAt)
    });

    setRoomSortOrder(id, 1);
    var idx : Nat = 2;
    for (room in sorted.vals()) {
      if (room.id != id) {
        setRoomSortOrder(room.id, idx);
        idx += 1;
      };
    };
    true;
  };

  public shared ({ caller }) func submitVideo(
    title : Text,
    description : Text,
    videoUrl : Text,
    thumbnailUrl : Text,
    paymentAddress : Text,
    price : Text,
    category : Text,
    viewDuration : Text,
    creatorName : Text,
  ) : async VideoSubmissionFull {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can submit videos");
    };
    let submissionId = nextSubmissionId;
    nextSubmissionId += 1;

    let newSubmission : VideoSubmission = {
      id = submissionId;
      submitterPrincipal = caller;
      title;
      description;
      videoUrl;
      thumbnailUrl;
      price;
      paymentAddress;
      category;
      viewDuration;
      creatorName;
      status = "Pending";
      createdAt = Time.now();
    };
    pendingSubmissions.add(submissionId, newSubmission);
    toFull(newSubmission);
  };

  public query ({ caller }) func getUserSubmissions() : async [VideoSubmissionFull] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) { Runtime.trap("Unauthorized") };
    pendingSubmissions.values()
      .filter(func(s) { s.submitterPrincipal == caller })
      .map(toFull)
      .toArray();
  };

  public query ({ caller }) func getPendingSubmissions() : async [VideoSubmissionFull] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admin can view pending submissions");
    };
    pendingSubmissions.values().map(toFull).toArray();
  };

  public shared ({ caller }) func reviewSubmission(
    id : Nat,
    approve : Bool,
    embedScript : Text,
    denialReason : Text,
  ) : async VideoSubmissionFull {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admin can review submissions");
    };
    switch (pendingSubmissions.get(id)) {
      case (null) { Runtime.trap("Submission not found") };
      case (?submission) {
        if (approve) {
          let roomId = nextRoomId;
          nextRoomId += 1;

          // Shift all existing rooms' order by +1 when adding new room at the top
          _roomSortOrders := _roomSortOrders.vals().map<(Nat, Nat), (Nat, Nat)>(func((k, v)) { (k, v + 1) }).toArray();

          let newRoom : Room = {
            id = roomId;
            title = submission.title;
            slug = makeUniqueSlug(submission.title);
            description = submission.description;
            price = submission.price;
            thumbnailUrl = submission.thumbnailUrl;
            videoUrl = submission.videoUrl;
            embedScript;
            createdAt = Time.now();
            viewDuration = submission.viewDuration;
            category = submission.category;
            creatorName = submission.creatorName;
          };
          rooms.add(roomId, newRoom);

          setRoomSortOrder(roomId, 1);
          let updated : VideoSubmission = { submission with status = "Approved" };
          pendingSubmissions.add(id, updated);
          toFull(updated);
        } else {
          let updated : VideoSubmission = { submission with status = "Denied" };
          pendingSubmissions.add(id, updated);
          setDenialReason(id, denialReason);
          toFull(updated);
        };
      };
    };
  };

  func toSlug(title : Text) : Text {
    let lower = title.toLower();
    let withDashes = lower.map(func(c) { if (c == ' ') { '-' } else { c } });
    let filteredChars = withDashes.toArray().filter(func(c) { not (c == '!' or c == '?') });
    Text.fromArray(filteredChars);
  };

  func makeUniqueSlug(title : Text) : Text {
    let baseSlug = toSlug(title);
    var uniqueSuffix : Nat = 0;
    var uniqueSlug = baseSlug;

    func isUnique(slug : Text) : Bool {
      switch (rooms.values().find(func(room) { room.slug == slug })) {
        case (null) { true };
        case (_) { false };
      };
    };

    loop {
      if (isUnique(uniqueSlug)) { return uniqueSlug };
      uniqueSuffix += 1;
      uniqueSlug := baseSlug # "-" # uniqueSuffix.toText();
    };
  };

  public shared ({ caller }) func resetAdmin() : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: only the current admin can reset admin access");
    };
    accessControlState.userRoles.add(caller, #user);
    accessControlState.adminAssigned := false;
  };

  public shared ({ caller }) func claimHardcodedAdmin() : async Bool {
    let callerText = caller.toText();
    let isOwner = hardcodedAdminTexts.vals().find(func(pid : Text) : Bool { pid == callerText }) != null;
    if (isOwner) {
      seedAdmin(caller);
      true;
    } else {
      false;
    };
  };
};

